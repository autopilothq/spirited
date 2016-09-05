import createEaser from './createEaser.js';
import createTween from './createTween.js';
import defaultOptions from './defaultOptions.js';
import TweenError from './TweenError.js';
import {isNumberArray} from '../validation.js';

// Private symbol
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
 * @example TODO
 * @private
 *
 */
export default class Animation {
  tweens = [];

  /**
   * Creates a new Animation
   * @param  {Array} initialTweenValues  The values for the intial tween.
   * @param  {Number} defaultDuration    The duration to use for the initial tween,
   *                                     and for another other tweens where durations
   *                                     are not provided.
   * @param  {String} easing             The name of the easing method to use.
   *                                     See {@link createEaser} docs for the
   *                                     possible options
   * @param  {Object} options            See {@link defaultOptions} for the valid options
   * @return {Animation}                 [description]
   * @throws {TweenError}
   */
  constructor(initialTweenValues, defaultDuration, {easing, ...options} = {}) {
    if (!isNumberArray(initialTweenValues)) {
      throw new TweenError('You must provide initialTweenValues as an array of numbers');
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
    const tweenValues = initialTweenValues.map(value => [value]);
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
    if (!isNumberArray(targetValues)) {
      throw new TweenError('Can only animate arrays of numbers');
    }

    if (this.tweens[0].values.length !== targetValues.length) {
      throw new TweenError('All tweens must have the same number of targets');
    }

    const previousTween = this.lastTween;
    const values = new Array(targetValues.length);

    previousTween.values.forEach((prevValue, i) => {
      prevValue[1] = targetValues[i] - prevValue[0];
      values[i] = [
        targetValues[i],
        this.tweens[0].values[i][0] - targetValues[i],
      ];
    });

    this.tweens.push(createTween(previousTween.end, duration, values));
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
   * @return {Array}              The array of interpolated values for the
   *                              desired elapsed time.
   */
  atTime(elapsedTime) {
    const [tween, duration] = this.tweenAtTime(elapsedTime);

    if (!tween) {
      return void 0;
    }

    return this.interpolate(tween, duration);
  }
}
