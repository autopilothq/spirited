import defaultOptions from './defaultOptions.js';
import getCardinalityAndEndTime from './getCardinalityAndEndTime.js';
import GroupError from './GroupError.js';

// Private symbols
const maybeRound = Symbol('MAYBEROUND');

const identityFn = value => value;

const validAggregationMethods = Object.freeze([
  'combine', 'compose',
]);

 /**
  * @desc This represents a group of animations. It exposes a public API identical
  * to that of {@link Animation} so that it can be used with {@link Playback} exactly
  * as {@link Animation} is.
  *
  * Like {@link Animation} this is private as you'd only instantiate it indirectly
  * via the high level {@link group}, {@link compose}, and {@link combine} API functions.
  *
  * @example TODO
  * @private
  *
  */
export default class AnimationGroup {
  /**
   * [constructor description]
   * @param  {Array} animations                   The array of Animations to group
   * @param  {Object} options                     Configuration for the group
   * @param  {String} options.aggregationMethod   Either 'compose' or 'combine'
   * @return {AnimationGroup}                     The AnimationGroup
   * @throws {GroupError}
   */
  constructor(animations, {aggregationMethod, ...options} = {}) {
    if (!Array.isArray(animations) || animations.length === 0) {
      throw new GroupError('You must supply AnimationGroups with at least one Animation');
    }

    if (!validAggregationMethods.includes(aggregationMethod)) {
      throw new GroupError(`Invalid aggregationMethod method for AnimationGropu:
        Got ${aggregationMethod}, expected one of ${validAggregationMethods.join(', ')}`);
    }


    // Note: consider these constant after they're set
    this.options = Object.freeze(Object.assign({}, defaultOptions, options));

    const {cardinality, totalDuration} = getCardinalityAndEndTime(animations);

    const resultsSize = this.aggregationMethod === 'combine'
                          ? cardinality
                          : animations.length;

    // Readonly for safety
    Object.defineProperties(this, {
      /**
       * The aggregation method of this group, either 'compose' or 'combine'
       *
       * @property {String} aggregationMethod - Either 'compose' or 'combine'
       * @memberof AnimationGroup#
       * @readonly
       */
      aggregationMethod: {value: aggregationMethod},

      /**
       * The animations that this group contains.
       *
       * @property {Array} animations - An Array of animations
       * @memberof AnimationGroup#
       * @readonly
       */
      animations: {value: animations},

      /**
       * A private container to hold the results of the last {@link AnimationGroup#atTime} call.
       * This is only used to avoid having to create a new Array to hold the
       * results on every tick.
       *
       * @property {Array} lastResult - The array of results
       * @memberof AnimationGroup#
       * @readonly
       * @private
       */
      lastResult: {value: new Array(resultsSize)},

      /**
       * The duration of the entire group in ms.
       *
       * @property {Number} totalDuration - The duration of the entire group in ms
       * @memberof AnimationGroup#
       * @readonly
       */
      totalDuration: {value: totalDuration},
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
