import Playback from './Playback';
import PlaybackGroup from './PlaybackGroup';
import createEaser from './createEaser.js';
import createTween from './createTween.js';
import defaultOptions from './defaultOptions.js';
import {isNumberArray} from './validation.js';

// Private symbols
const maybeRound = Symbol('MAYBEROUND');

const identityFn = value => value;


/**
 * This represents an abstract definition of a animation. It can be used to define
 * an particular animation one, which can then be use many times by creating multiple
 * Playback objects from it.
 *
 * This is used by the animate function, user's don't manually instantiate it,
 * hence it's private.
 *
 * @TODO docs
 *
 * tween value format is:
 * * value at duration 0 of the tween
 * * difference between this value and the next tweens (delta value)
 * * previous tweens duration
 * * current tweens duration
 * Note: durations are measured from time 0, which is when the first tween
 * starts.
 *
 * @constructor
 * @private
 *
 */
export default class Animation {
  tweens = [];

  /**
   * Returns a function that groups the desires animations together using aggregationMethod
   * The function can be called to generate a playback group for all of the animations.
   *
   * @param  {[type]} animations        [description]
   * @param  {[type]} aggregationMethod [description]
   * @return {[type]}                   [description]
   */
  static group(animations, aggregationMethod) {
    // The last arg will actually be a the aggregationMethod, which is a string.
    // It is required so let's throw an error if it's omitted.
    // The signature of this method ends up being a little weird because JS
    // doesn't support left variadic groups, if it did then we could just
    // say:  group(...animations, aggregationMethod)
    //
    if (typeof aggregationMethod !== 'string') {
      throw new Error('You must provide an aggregation method for the group');
    }

    return (...entities) => {
      return new PlaybackGroup(animations, entities, aggregationMethod);
    };
  }

  constructor(initialTweenValues, defaultDuration, {easing, elasticity, ...options} = {}) {
    if (!isNumberArray(initialTweenValues)) {
      throw new Error('You must provide initialTweenValues as an array of numbers');
    }

    if (defaultDuration === void 0) {
      throw new Error('You must provide a default duration to the animation');
    }

    // Readonly for safety
    Object.defineProperty(this, 'defaultDuration', {
      get: () => defaultDuration,
    });

    // Note: consider these constant after they're set
    this.options = Object.freeze(Object.assign({}, defaultOptions, options));
    this.ease = createEaser(easing, elasticity);

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
   * [lastTween description]
   * @return {[type]} [description]
   */
  get lastTween() {
    return this.tweens[this.tweens.length - 1];
  }

  /**
   * [tween description]
   * @param  {[type]} targetValues                    [description]
   * @param  {[type]} [duration=this.defaultDuration] [description]
   * @return {[type]}                                 [description]
   */
  tween(targetValues, duration = this.defaultDuration) {
    if (!isNumberArray(targetValues)) {
      throw new Error('Can only animate arrays of numbers');
    }

    if (this.tweens[0].values.length !== targetValues.length) {
      throw new Error('All tweens must have the same number of targets');
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
   * [playback description]
   * @param  {[type]} entities [description]
   * @return {[type]}          [description]
   */
  playback(...entities) {
    return new Playback(this, ...entities);
  }

  /**
   * [elapsedToDuration description]
   * @param  {Number} [elapsedTime=0] [description]
   * @return {[type]}                 [description]
   */
  elapsedToDuration(elapsedTime = 0) {
    if (elapsedTime < 0) {
      const msg = `Cannot find a tween before the animation starts: ${elapsedTime} < 0`;
      throw new Error(msg);
    }

    const endTime = this.lastTween.end;
    let duration = elapsedTime;

    if (duration >= endTime) {
      if (this.options.loop === false) {
        // It's after the animation would have stopped. This isn't an error
        // but there also isn't a valid duration that we can return.
        return void 0;
      }

      duration %= endTime;
    }

    return duration;
  }

  /**
   * [tweenAtTime description]
   * @param  {[type]} elapsedTime [description]
   * @return {[type]}             [description]
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
   * [interpolate description]
   * @param  {[type]} tween [description]
   * @param  {[type]} time  [description]
   * @return {[type]}       [description]
   */
  interpolate(tween, time) {
    const {values, start, duration} = tween;
    const ease = this.ease((time - start) / duration);
    const maybeRoundFn = this[maybeRound];
    return values.map(([value, change]) => maybeRoundFn(value + change * ease));
  }

  /**
   * [atTime description]
   * @param  {[type]} elapsedTime [description]
   * @return {[type]}             [description]
   */
  atTime(elapsedTime) {
    const [tween, duration] = this.tweenAtTime(elapsedTime);

    if (!tween) {
      return [];
    }

    return [
      this.interpolate(tween, duration),
      duration,
    ];
  }
}
