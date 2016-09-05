import defaultOptions from './defaultOptions.js';

// Animation states
const started = Symbol('STARTED');
const stopping = Symbol('STOPPING');
const idle = Symbol('IDLE');


/**
 * Playback object. Think of this as a concrete use of an Animation.
 * User's don't manually instantiate it, hence it's private.
 *
 * @TODO docs for parameters
 * @TODO docs for entities
 *
 * @constructor
 * @private
 *
 */
export default class Playback {
  currentValue = void 0;
  lastElapsed = 0.0;
  startedAt = 0.0;
  state = idle;
  onCompleteCallback = void 0;
  onTickCallback = void 0;

  /**
   * [create description]
   * @param  {Array} animation [description]
   * @param  {Array} entities  [description]
   * @param  {Object} options  [description]
   * @return {Playback}        [description]
   */
  static create(animation, entities, options) {
    return new Playback(animation, entities, options);
  }

  /**
   *
   *
   * @param  {[type]} animation    [description]
   * @param  {[type]} entities     [description]
   * @param  {Object} [options={}] [description]
   * @return {[type]}              [description]
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
   * @param  {Number} now [description]
   * @return {Playback} The Playback object
   */
  start(now) {
    if (this.state !== idle) {
      throw new Error('Playback has already started');
    }

    this.state = started;
    this.startedAt = now;
    this.lastElapsed = 0;
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
    this.currentValue = [];

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
   * Clean up immediately. After destroy the object cannot be used anymore
   *
   * @return {undefined}
   */
  destroy() {
    // blank onTickCallback so it cannot be called accidently
    this.onTickCallback = void 0;
    this.stop(true);
  }

  /**
   * [tick description]
   * @param  {Number} now [description]
   * @return {Array}     [description]
   */
  tick(now) {
    if (this.state === idle) {
      // not runing, do nuthin
      return [];
    }

    const elapsed = now - this.startedAt;
    const progress = t => Math.floor(t / this.animation.totalDuration);
    const justLooped = progress(elapsed) > progress(this.lastElapsed);

    if (this.stopping && justLooped) {
      // This means that our time caused the animation to loop around, we've
      // passed through the start point since the last tick so it's safe to
      // reset to the first tween and then stop.
      this.currentValue = void 0;
    } else {
      this.currentValue = this.animation.atTime(elapsed);
    }

    if (this.currentValue === void 0) {
      // If we couldn't find a tween for this time, but the animation is started,
      // then it means that the animation has just completed, or it was already
      // stopping and it just looped.
      this.stop(true);
    }

    if (this.onTickCallback) {
      this.onTickCallback(...this.currentValue, now);
    }

    return this.currentValue;
  }
}
