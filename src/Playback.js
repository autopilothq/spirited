import present from 'present';

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
  currentDuration = 0.0;
  lastElapsed = 0.0;
  startedAt = 0.0;
  state = idle;
  onCompleteCallbacks = [];
  onTickCallbacks = [];

  constructor(animation, ...entities) {
    this.animation = animation;
    this.entities = entities;
  }

  /**
   * [started description]
   * @return {[type]} [description]
   */
  get started() {
    return this.state !== idle;
  }

  /**
   * [stopping description]
   * @return {[type]} [description]
   */
  get stopping() {
    return this.state === stopping;
  }

  /**
   * [start description]
   * @return {[type]} [description]
   */
  start() {
    if (this.state !== idle) {
      throw new Error('Playback has already started');
    }

    this.state = started;
    this.currentDuration = 0.0;
    this.startedAt = present();
    this.lastElapsed = 0;
    return this;
  }

  /**
   * [stop description]
   * @return {[type]} [description]
   */
  stop() {
    if (this.state === idle) {
      return this;
    }

    if (this.animation.options.gracefulStop && this.currentDuration > 0) {
      this.state = stopping;
      return this;
    }

    this.state = idle;
    this.currentValue = [];
    this.currentDuration = 0.0;

    if (this.onCompleteCallbacks.length) {
      for (const callback of this.onCompleteCallbacks) {
        callback();
      }
    }

    return this;
  }

  /**
   * [onTick description]
   * @param  {Function} callback [description]
   * @return {[type]}            [description]
   */
  onTick(callback) {
    if (typeof callback !== 'function') {
      throw new Error('onTick callback must be a function');
    }

    this.onTickCallbacks.push(callback);
    return this;
  }

  /**
   * [onComplete description]
   * @param  {Function} callback [description]
   * @return {[type]}            [description]
   */
  onComplete(callback) {
    if (typeof callback !== 'function') {
      throw new Error('onComplete callback must be a function');
    }

    this.onCompleteCallbacks.push(callback);
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

    const lastTween = this.animation.tweens[this.animation.tweens.length - 1];
    const endTime = lastTween.end;
    const elapsed = now - this.startedAt;
    const justLooped = Math.floor(elapsed / endTime) > Math.floor(this.lastElapsed / endTime);

    if (this.stopping && justLooped) {
      // This means that our time caused the animation to loop around, we've
      // passed through the start point since the last tick so it's safe to
      // reset to the first tween and then stop.
      this.currentValue = void 0;
      this.currentDuration = 0.0;
    } else {
      let [value, duration] = this.animation.atTime(elapsed);
      this.currentDuration = duration;
      this.currentValue = value;
    }

    if (this.currentValue === void 0) {
      // If we couldn't find a tween for this time, but the animation is started,
      // then it means that the animation has just completed.
      this.stop();
    } else if (this.onTickCallbacks.length) {
      for (const callback of this.onTickCallbacks) {
        callback(this.currentValue, now);
      }
    }

    return this.currentValue;
  }
}
