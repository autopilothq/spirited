import defaultOptions from './defaultOptions.js';
import getCardinalityAndEndTime from './getCardinalityAndEndTime.js';
import GroupError from './GroupError.js';

// Private symbols and helpers
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
  * @private
  * @example Combine a shaking animation with a move animation
  *
  *     // Animate between 0, 10, and -10 in a kind of shaking motion
  *     const shakeAnim = animate([0], 150, { loop: true, easing: 'linear' })
  *                         .tween([10], 300)
  *                         .tween([-10], 150);
  *
  *     // Move from 100, 50 to 100, 350
  *      const moveAnim = animate([100, 50], 2000)
  *                         .tween([100, 350], 2000)
  *
  *     // example low-level usage. In real usuage you would actually use the
  *     // {@link group}, {@link compose}, or {@link combine} helper functions,
  *     // the arguments are identical though.
  *     const group = new AnimationGroup([moveAnim, shakeAnim], {
  *       aggregationMethod: 'combine'
  *     });
  *
  *     group.atTime(0);     // => [175, 50]    ; at time 0. shake and move at tween 0
  *     group.atTime(150);   // => [185, 53]    ; begin of shake tween 1
  *     group.atTime(450);   // => [165, 80]    ; begin of shake tween 2
  *     group.atTime(600);   // => [175, 104]   ; shake loops back to tween 0,
  *                                             ; roughly 60% of the way through
  *                                             ; move tween 0
  *     group.atTime(2000);  // => [182, 350]   ; begin of move tween 1
  *     group.atTime(4000);  // => [168, 50]    ; move loops back to tween 0
  *
  *     // Note: if loop was false, then `group.atTime(4000);` would have
  *     // returns undefined as time 4000 beyond the end of both of the Animations.
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


    const {cardinality, totalDuration} = getCardinalityAndEndTime(animations);
    const resultsSize = aggregationMethod === 'combine'
                          ? cardinality
                          : animations.length;

    // Readonly for safety
    Object.defineProperties(this, {
      /**
       * @property {Object} options - Config options
       * @memberof AnimationGroup#
       * @readonly
       */
      options: {
        value: Object.freeze(Object.assign({}, defaultOptions, options)),
      },

      /**
       * @property {String} aggregationMethod - Either 'compose' or 'combine'
       * @memberof AnimationGroup#
       * @readonly
       */
      aggregationMethod: {value: aggregationMethod},

      /**
       * @property {Array} animations - The animations that this group contains.
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
   * Get the combined value for the group at elapsed time. This is not public,
   * it is a helper of {@link AnimationGroup#atTime}
   *
   * @see {@link AnimationGroup#atTime} for a longer description of elapsedTime
   *
   * @param  {Number} elapsedTime The time relative to the animation
   * @return {Array|undefined}    Either an Array of Number values, or undefined
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
   * Get the composed value for the group at elapsed time. This is not public,
   * it is a helper of {@link AnimationGroup#atTime}
   *
   * @see {@link AnimationGroup#atTime} for a longer description of elapsedTime
   *
   * @param  {Number} elapsedTime The time relative to the animation
   * @return {Array|undefined}    Either an Array of Number values, or undefined
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
   * Get the values for the animation at the desired elapsed time.
   *
   * Note: an elapsed time is one that is assumed to be relative to the animation
   * timeline. I.e. time 0 in elapsed time is time 0 (the start) of the animation.
   * This simplifies logic in this method but it's the burden of the caller to
   * ensure that they provide the correct time.
   *
   * @see {@link Playback#tick} for an example of converting an absolute time
   * to a relative "elapsdTime" one.
   *
   * @param  {Number} elapsedTime The time relative to the animation
   * @return {Array|undefined}    The array of interpolated values for the
   *                              desired elapsed time, or undefined if the animations
   *                              would all be complete at elapsedTime
   *
   */
  atTime(elapsedTime) {
    if (this.aggregationMethod === 'combine') {
      return this.combine(elapsedTime);
    }

    return this.compose(elapsedTime);
  }
}
