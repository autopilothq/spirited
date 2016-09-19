import EventEmitter from 'eventemitter3';
import defaultOptions from './defaultOptions.js';
import PlaybackError from './PlaybackError.js';

// Valid Animation states
const started = Symbol('STARTED');
const stopping = Symbol('STOPPING');
const idle = Symbol('IDLE');


/**
 * @desc Playback object. Think of this as a concrete use of the more-abstract Animation.
 * You could view Playback as a particular animation at a particular point in time.
 *
 * User's don't manually instantiate it, hence it's private.
 *
 * @private
 * @example Animate two numbers between 1..3 and 2..8
 *
 *     const options = {
 *       loop: true,        // loop at the end of the animation
 *       round: false,      // don't round interpolated tween values
 *       easing: 'linear',  // ease (interpolate) values linearly
 *     };
 *
 *     // Create an animation with a initial tween that has the values [1, 2]
 *     // and a duration of 200ms
 *     const animation = animate([1, 2], 200, options)
 *                          .tween([2, 4], 200)
 *                          .tween([3, 8, 400]);
 *
 *     // example low-level usage. In real usuage you would actually use the
 *     // {@link playback} helper function, the arguments are identical though.
 *     const playback = new Playback(animation)
 *                          .onTick((left, top) => {
 *                            console.log('TICK!', left, top);
 *                          })
 *                          .onComoplete(() => {
 *                            console.log('Animation has completed');
 *                          });
 *
 */
export default class Playback extends EventEmitter {
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
    super();
    this.animation = animation;
    this.entities = entities;

    // Note: consider these constant after they're set
    this.options = Object.freeze(Object.assign({}, defaultOptions, options));
  }

  /**
   * Begin playback
   *
   * @param  {Number} time [description]
   * @return {Playback} The Playback object
   * @throws {PlaybackError}
   */
  start(time) {
    if (this.state !== idle) {
      throw new PlaybackError('Playback has already started');
    }

    this.state = started;
    this.startedAt = time;
    this.elapsedDurations = 0;
    return this;
  }

  /**
   * Indicates whether the playback has started.
   *
   * @property {boolean}  started  - True if the animation is running, false otherwise
   * @private
   */
  get started() {
    return this.state !== idle;
  }

  /**
   * Indicates whether the playback is stopping.
   *
   * @property {boolean}  stopping  - True if the animation is stopping, i.e. will stop the next
   *                                  time that it loops.
   * @private
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
    this.emit('end');

    return this;
  }

  /**
   * @TODO
   * @return {Number} @TODO
   * @private
   *
   */
  get cardinality() {
    return this.animation.cardinality;
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
    // blank listeners so it cannot be called accidently after this point
    this.removeAllListeners();
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
    this.elapsedDurations = elapsedDurations;
    let currentValue;

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
    } else {
      this.emit('tick', ...currentValue, time);
    }

    // @TODO if it's an animation group then currentValue will be an array
    // of arrays instead of just an array
    return currentValue !== void 0 ? currentValue : [];
  }
}
