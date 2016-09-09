import createEaser from './createEaser.js';
import createTween from './createTween.js';
import defaultOptions from './defaultOptions.js';
import TweenError from './TweenError.js';
import {isNumberArray} from '../validation.js';

// Private symbols and helpers
const maybeRound = Symbol('MAYBEROUND');
const identityFn = value => value;


/**
 * @desc This represents an abstract definition of an animation, it describes each
 * tween, their values, and their duration.
 *
 * Note: durations are measured from time 0, which is when the first tween  starts.
 * I.e. A tween that starts at 200, starts at 200ms from when the animation begins
 *
 * This object can be used to define an particular animation once, which can then
 * be use many times by creating multiple Playback objects from it.
 *
 * This is used by the animate function, user's don't manually instantiate it,
 * hence it's private.
 *
 * @see {@link createTween} for the format of tweens
 * @see {@link Playback} for the less abstract form of an animation.
 *
 * @private
 * @example
 *     // example low-level usage. You should actually use the {@link animate}
 *     // helper function in real usuage, the arguments are identical though.
 *     const options = {
 *       loop: true,        // loop at the end of the animation
 *       round: false,      // don't round interpolated tween values
 *       easing: 'linear',  // ease (interpolate) values linearly
 *     };
 *
 *     // Create an animation with a initial tween that has the values [1, 2]
 *     // and a duration of 200ms
 *     const animation = new Animation([1, 2], 200, options);
 *
 *     // Add two more tweens
 *     animation.tween([2, 4], 200)
 *              .tween([3, 8, 400]);
 *
 *     animation.atTime(0);     // => [1, 2]    ; at time 0
 *     animation.atTime(100);   // => [1.5, 3]  ; 50% between tween 0 and 1
 *     animation.atTime(200);   // => [2, 4]    ; start of tween 1
 *     animation.atTime(400);   // => [3, 8]    ; start of tween 2
 *     animation.atTime(600);   // => [1.5, 4]  ; 50% through tween 2, which loops
 *                                              ; back to tween 0, so we 50% of the
 *                                              ; way back to tween 0's values.
 *     animation.atTime(1000);   // => [2, 4]   ; We looped back to the start of tween 1
 *
 *     // Note: if loop was false, then `animation.atTime(1000);` would have
 *     // returns undefined as time 1000 beyond the end of the Animation. You add
 *     // all the durations to know the total duration. In this case it would be
 *     // 800 (200+200+400).
 *
 */
export default class Animation {
  /**
   * The animation tweens
   *
   * @property {Array}  tweens  - The array of tween objects
   */
  tweens = [];

  /**
   * Creates a new Animation
   * @param  {Array|Number} initialValues   The values for the intial tween.
   * @param  {Number} defaultDuration       The duration to use for the initial tween,
   *                                        and for another other tweens where durations
   *                                        are not provided.
   * @param  {String} easing                The name of the easing method to use.
   *                                        See {@link createEaser} docs for the
   *                                        possible options
   * @param  {Object} options               See {@link defaultOptions} for the valid options
   * @return {Animation}                    The new Animation
   * @throws {TweenError}
   */
  constructor(initialValues, defaultDuration, {easing, ...options} = {}) {
    if (typeof initialValues !== 'number' && !isNumberArray(initialValues)) {
      throw new TweenError(
        'You must provide initialValues as a single number or a array of numbers');
    }

    if (defaultDuration === void 0) {
      throw new TweenError('You must provide a default duration to the animation');
    }

    // Readonly for safety
    Object.defineProperty(this, 'defaultDuration', {
      value: defaultDuration,
    });

    // Note: consider these constant after they're set
    this.options = Object.freeze(Object.assign({}, defaultOptions, options));
    this.ease = createEaser(easing);

    // Usually the tween values are actuall pairs of [value, deltaToTheNextValue]
    // we can't calculate the delta initially though, as we only have a single
    // tween.
    const tweenValues = Array.isArray(initialValues)
                          ? initialValues.map(value => [value])
                          : [[initialValues]];

    this.tweens.push(createTween(0, defaultDuration, tweenValues));

    // Maybe this a private helper, it get's used in interpolate
    this[maybeRound] = (() => {
      if (this.options.round) {
        return ::Math.round;
      }

      return identityFn;
    })();
  }

  /**
   * The last tween of the animation
   *
   * @property {object}  lastTween  - The last tween of the animation
   * @private
   */
  get lastTween() {
    return this.tweens[this.tweens.length - 1];
  }

  /**
   * The duration, in ms, of the animation
   *
   * @property {Number}  totalDuration  - The duration, in ms, of the animation
   */
  get totalDuration() {
    return this.lastTween && this.lastTween.end;
  }

  /**
   * Add a tween to the animation.
   * @param  {Array} targetValues                       The values for the tween
   * @param  {Number} [duration=this.defaultDuration]   The duration of this tween
   * @return {Animation}                                Returns this, for chaining
   * @throws {TweenError}
   */
  tween(targetValues, duration = this.defaultDuration) {
    if (typeof targetValues !== 'number' && !isNumberArray(targetValues)) {
      throw new TweenError(
        'You must provide initialValues as a single number or a array of numbers');
    }

    const values = Array.isArray(targetValues) ? targetValues : [targetValues];
    const valuesAndDeltas = new Array(values.length);
    const firstTweenValues = this.tweens[0].values;

    if (firstTweenValues.length !== values.length) {
      throw new TweenError('All tweens must have the same number of targets');
    }

    this.lastTween.values.forEach((prevValue, i) => {
      prevValue[1] = values[i] - prevValue[0];

      valuesAndDeltas[i] = [
        values[i],
        firstTweenValues[i][0] - values[i],
      ];
    });

    this.tweens.push(createTween(this.lastTween.end, duration, valuesAndDeltas));
    return this;
  }

  /**
   * Converts an elapsed time to an animation duration. If the elapsed time is
   * after the end of the animation, and looping is disabled, then undefined
   * will be returned.
   *
   * @see {@link Animation#atTime} for a longer description of elapsedTime
   * @see {@link Playback#tick} for an example of converting an absolute time
   * to a relative "elapsdTime" one.
   *
   * @param  {Number} [elapsedTime=0] The time relative to the animation
   * @return {Number|undefined}       The duration, within the animation, that
   *                                  the elapsed time represents
   * @throws {TweenError}
   * @private
   */
  elapsedToDuration(elapsedTime = 0) {
    if (elapsedTime < 0) {
      const msg = `Cannot find a tween before the animation starts: ${elapsedTime} < 0`;
      throw new TweenError(msg);
    }

    const totalDuration = this.lastTween.end;
    let duration = elapsedTime;

    if (duration >= totalDuration) {
      if (this.options.loop === false) {
        // It's after the animation would have stopped. This isn't an error
        // but there also isn't a valid duration that we can return.
        return void 0;
      }

      duration %= totalDuration;
    }

    return duration;
  }

  /**
   * Gets the tween and the duration of a specific elapsed time.
   *
   * @see {@link Animation#atTime} for a longer description of elapsedTime
   *
   * @param  {Number} elapsedTime The time relative to the animation
   * @return {Array}              An Array containing the tween, and the duration
   *                              for the desired elapsedTime. If none could be
   *                              found then an empty array will be returned.
   * @private
   */
  tweenAtTime(elapsedTime) {
    // Calculate how far through the animation we are, taking into account looping.
    const duration = this.elapsedToDuration(elapsedTime);
    const allTweens = this.tweens;

    if (duration === void 0) {
      // The animation has stopped, there is no tween
      return [];
    }

    // Matches the start tween
    if (duration >= allTweens[0].start && duration < allTweens[0].end) {
      return [allTweens[0], duration];
    }

    for (let i = 1; i < allTweens.length; ++i) {
      const tween = allTweens[i];
      if (duration >= tween.start && duration < tween.end) {
        return [tween, duration];
      }
    }

    return [];
  }

  /**
   * Interpolates a particular tweens value to time.
   *
   * @param  {Tween} tween  The tween to interpolate
   * @param  {Number} time  The time value to interpolate to. Note: that this s
   *                        hould be bound to within 0...tween.duration
   * @return {Array}        The interpolated values for time
   * @private
   */
  interpolate(tween, time) {
    const {values, start, duration} = tween;
    const ease = this.ease((time - start) / duration);
    const maybeRoundFn = this[maybeRound];
    return values.map(([value, change]) => maybeRoundFn(value + change * ease));
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
   *                              desired elapsed time, or undefined if the animation
   *                              would be complete at elapsedTime
   *
   */
  atTime(elapsedTime) {
    const [tween, duration] = this.tweenAtTime(elapsedTime);

    if (!tween) {
      return void 0;
    }

    return this.interpolate(tween, duration);
  }
}
