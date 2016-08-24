import Playback from './Playback';
import createEaser from './createEaser.js';
import defaultOptions from './defaultOptions.js';

// Private symbols
const maybeRound = Symbol('MAYBEROUND');

const identityFn = value => value;

const validAggregationMethods = Object.freeze([
  'combine', 'compose',
]);

/**
 * Looks at an array of animations and works out which returns the max
 * cardinality of all of their tween values.
 *
 * @param  {Array} animations An array of Animation objects
 * @return {Number}           The max cardinality, as an integer
 */
const largestValueCardinality = (animations) => {
  let max = -1;

  for (const {tweens} of animations) {
    if (tweens[0].values.length > max) {
      max = tweens[0].values.length;
    }
  }

  return max;
};


/**
 * @TODO docs
 *
 * @constructor
 * @private
 *
 */
export default class AnimationGroup {
  constructor(animations, {aggregationMethod, easing, elasticity, ...options} = {}) {
    if (!Array.isArray(animations) || animations.length === 0) {
      throw new Error('You must supply AnimationGroups with at least one Animation');
    }

    if (!validAggregationMethods.includes(aggregationMethod)) {
      throw new Error(`Invalid aggregationMethod method for AnimationGropu:
        Got ${aggregationMethod}, expected one of ${validAggregationMethods.join(', ')}`);
    }


    // Note: consider these constant after they're set
    this.options = Object.freeze(Object.assign({}, defaultOptions, options));
    this.ease = createEaser(easing, elasticity);

    const resultsSize = this.aggregationMethod === 'combine'
                          ? largestValueCardinality(animations)
                          : animations.length;

    // Readonly for safety
    Object.defineProperties(this, {
      aggregationMethod: {value: aggregationMethod},
      animations: {value: animations},
      lastResult: {value: new Array(resultsSize)},
    });

    // Maybe this a private helper, it get's used in interpolate
    this[maybeRound] = (() => {
      if (this.options.round) {
        return ::Math.round;
      }

      return identityFn;
    })();
  }

  /**
   * [playback description]
   * @param  {Array} entities    [description]
   * @return {Playback}          [description]
   */
  playback(entities) {
    return new Playback(this, ...entities);
  }

  /**
   * [combine description]
   * @param  {[type]} elapsedTime [description]
   * @return {[type]}     [description]
   * @private
   */
  combine(elapsedTime) {
    let hasResults = false;
    this.lastResult.fill(0);

    for (const animation of this.animations) {
      const results = animation.atTime(elapsedTime);
      if (results) {
        hasResults = true;

        results.forEach((result, i) => {
          this.lastResult[i] += result;
        });
      }
    }

    return hasResults ? this.lastResult : void 0;
  }

  /**
   * [compose description]
   * @param  {[type]} elapsedTime [description]
   * @return {[type]}     [description]
   * @private
   */
  compose(elapsedTime) {
    let hasResults = false;

    this.animations.forEach((animation, i) => {
      const result = animation.atTime(elapsedTime);
      if (result) {
        hasResults = true;
        this.lastResult[i] = result.length > 1 ? result : result[0];
      } else {
        this.lastResult[i] = void 0;
      }
    });

    return hasResults ? this.lastResult : void 0;
  }

  /**
   * [atTime description]
   * @param  {[type]} elapsedTime [description]
   * @return {[type]}             [description]
   */
  atTime(elapsedTime) {
    if (this.aggregationMethod === 'combine') {
      return this.combine(elapsedTime);
    }

    return this.compose(elapsedTime);
  }
}
