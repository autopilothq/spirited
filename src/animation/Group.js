import defaultOptions from './defaultOptions.js';
import getCardinalityAndEndTime from './getCardinalityAndEndTime.js';

// Private symbols
const maybeRound = Symbol('MAYBEROUND');

const identityFn = value => value;

const validAggregationMethods = Object.freeze([
  'combine', 'compose',
]);

/**
 * @TODO docs
 *
 * @constructor
 * @private
 *
 */
export default class AnimationGroup {
  constructor(animations, {aggregationMethod, ...options} = {}) {
    if (!Array.isArray(animations) || animations.length === 0) {
      throw new Error('You must supply AnimationGroups with at least one Animation');
    }

    if (!validAggregationMethods.includes(aggregationMethod)) {
      throw new Error(`Invalid aggregationMethod method for AnimationGropu:
        Got ${aggregationMethod}, expected one of ${validAggregationMethods.join(', ')}`);
    }


    // Note: consider these constant after they're set
    this.options = Object.freeze(Object.assign({}, defaultOptions, options));

    const {cardinality, endTime} = getCardinalityAndEndTime(animations);

    const resultsSize = this.aggregationMethod === 'combine'
                          ? cardinality
                          : animations.length;

    // Readonly for safety
    Object.defineProperties(this, {
      aggregationMethod: {value: aggregationMethod},
      animations: {value: animations},
      lastResult: {value: new Array(resultsSize)},
      endTime: {value: endTime},
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
