import defaultOptions from './defaultOptions.js';

// Valid Animation states
const started = Symbol('STARTED');
const stopping = Symbol('STOPPING');
const idle = Symbol('IDLE');


/**
 * Playback object. Think of this as a concrete use of the more-abstract Animation.
 * You could view Playback as a particular animation at a particular point in time.
 *
 * User's don't manually instantiate it, hence it's private.
 *
 * @example TODO
 *
 * @private
 *
 */
export default class Playback {
  /**
   * Indicates the current playback state.
   *
   * @property {started|stopping|idle} state - The current playback state
   * @readonly
   */
  state = idle;

  /**
   * The number of multiples of this.animation.totalDuration that we have
   * passed through. If it's > 0 then we've looped at least once. This is only
   * used for internal book keeping.
   *
   * @property {Number}  elapsedDurations  - The multiple of animation total
   *                                         duration that playback is in
   * @private
   * @readonly
   */
  elapsedDurations = 0;

  /**
   * The time when Playback is started. This is set automatically when {@link Playback#start}
   * is called
   *
   * @property {Number}   startedAt - the timestamp when the Playback was started
   * @private
   * @readonly
   */
  startedAt = 0.0;

  onCompleteCallback = void 0;
  onTickCallback = void 0;

  /**
   * Playback constructor.
   *
   * @param  {Animation} animation  The Animation to play
   * @param  {Array} entities       Related entities that will be passed to the onTick callback
   * @param  {Object} [options={}]  See {@link defaultOptions} for the valid options
   * @return {Playback}             The new Playback
   *
   */
  constructor(animation, entities, options = {}) {
    this.animation = animation;
    this.entities = entities;

    // Note: consider these constant after they're set
    this.options = Object.freeze(Object.assign({}, defaultOptions, options));
  }

  /**
   * Indicates whether the playback has started.
   *
   * @property {boolean}  started  - True if the animation is running, false otherwise
   */
  get started() {
    return this.state !== idle;
  }

  /**
   * Begin playback
   *
   * @param  {Number} time [description]
   * @return {Playback} The Playback object
   */
  start(time) {
    if (this.state !== idle) {
      throw new Error('Playback has already started');
    }

    this.state = started;
    this.startedAt = time;
    this.elapsedDurations = 0;
    return this;
  }

  /**
   * Indicates whether the playback is stopping.
   *
   * @property {boolean}  stopping  - True if the animation is stopping, i.e. will stop the next
   *                                  time that it loops.
   */
  get stopping() {
    return this.state === stopping;
  }

  /**
   * End playback, either immediately (ignoreGraceful=true) or the next time
   * that it loops. By default ignoreGraceful is false, this means that Playback
   * will usually finish on the initial value.
   *
   * @param {boolean} [ignoreGraceful=false] If true, the playback will be immediately stopped.
   * @return {Playback} The Playback object
   */
  stop(ignoreGraceful = false) {
    if (this.state === idle) {
      return this;
    }

    if (!ignoreGraceful && this.options.gracefulStop) {
      this.state = stopping;
      return this;
    }

    this.state = idle;

    if (this.onCompleteCallback) {
      this.onCompleteCallback();
    }

    return this;
  }

  /**
   * Sets the callback to trigger whenever a tick occurs.
   *
   * @param  {Function} callback The callback to trigger onTick
   * @return {Playback} The Playback object
   */
  onTick(callback) {
    if (typeof callback !== 'function') {
      throw new Error('onTick callback must be a function');
    }

    this.onTickCallback = callback;
    return this;
  }

  /**
   * Sets the callback to trigger when the playback completes.
   *
   * @param  {Function} callback The callback to trigger on complete
   * @return {Playback} The Playback object
   */
  onComplete(callback) {
    if (typeof callback !== 'function') {
      throw new Error('onComplete callback must be a function');
    }

    this.onCompleteCallback = callback;
    return this;
  }

  /**
   * Clean up immediately.
   *
   * After #destroy this object cannot be safely used anymore. Here be
   * dragons, abandon all hope, etc.
   *
   * @return {undefined}
   */
  destroy() {
    // blank onTickCallback so it cannot be called accidently
    this.onTickCallback = void 0;
    this.stop(true);
  }

  /**
   * Advance the playback to time. This will trigger onTick and onComplete callbacks
   * as necessary (synchronously) and return the array of current values.
   *
   * @param  {Number} time  The time to tick to
   * @return {Array}        The array of interpolated values for time
   */
  tick(time) {
    if (this.state === idle) {
      // not runing, do nuthin
      return [];
    }

    const elapsed = time - this.startedAt;
    const elapsedDurations = Math.floor(elapsed / this.animation.totalDuration);
    const justLooped = elapsedDurations > this.elapsedDurations;
    let currentValue;
    this.elapsedDurations = elapsedDurations;

    if (this.stopping && justLooped) {
      // This means that our time caused the animation to loop around, we've
      // passed through the start point since the last tick so it's safe to
      // reset to the first tween and then stop.
      currentValue = void 0;
    } else {
      currentValue = this.animation.atTime(elapsed);
    }

    if (currentValue === void 0) {
      // If we couldn't find a tween for this time, but the animation is started,
      // then it means that the animation has just completed, or it was already
      // stopping and it just looped.
      this.stop(true);
    }

    if (this.onTickCallback) {
      this.onTickCallback(...currentValue, time);
    }

    return currentValue || [];
  }
}
