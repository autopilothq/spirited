import present from 'present';
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
   * @return {Playback}        [description]
   */
  static create(animation, entities) {
    return new Playback(animation, entities);
  }

  constructor(animation, entities, options = {}) {
    this.animation = animation;
    this.entities = entities;

    // Note: consider these constant after they're set
    this.options = Object.freeze(Object.assign({}, defaultOptions, options));
  }

  /**
   * [started description]
   * @return {boolean} True if the animation is running, false otherwise
   */
  get started() {
    return this.state !== idle;
  }

  /**
   * [stopping description]
   * @return {boolean} True if the animation is stopping, i.e. will stop the next
   *                        time that it loops.
   */
  get stopping() {
    return this.state === stopping;
  }

  /**
   * [start description]
   * @return {Playback} The Playback object
   */
  start() {
    if (this.state !== idle) {
      throw new Error('Playback has already started');
    }

    this.state = started;
    this.startedAt = present();
    this.lastElapsed = 0;
    return this;
  }

  /**
   * [stop description]
   * @param {boolean} ignoreGraceful [description]
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
   * [onTick description]
   * @param  {Function} callback [description]
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
   * [onComplete description]
   * @param  {Function} callback [description]
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
    // TODO blank this.onTickCallback (so it cannot be called accidently
    // TODO stop the animation immediately (ignore gracefulStop))
  }

  /**
   * [tick description]
   * @param  {[type]} now [description]
   * @return {[type]}     [description]
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
    } else if (this.onTickCallback) {
      this.onTickCallback(...this.currentValue, now);
    }

    return this.currentValue;
  }
}
