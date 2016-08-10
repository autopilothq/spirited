import present from 'present';
import createEaser from './createEaser.js';
import defaultOptions from './defaultOptions.js';

// Animation states
const started = Symbol('STARTED');
const stopping = Symbol('STOPPING');
const idle = Symbol('IDLE');

// Private symbols
const tweens = Symbol('TWEENS');
const maybeRound = Symbol('MAYBEROUND');

const isNumber = (obj) => typeof obj === 'number';
const isNumberArray = (obj) => Array.isArray(obj) && obj.every(isNumber);
const identityFn = function(value) {
  return value;
};

function createTween(start, duration, values) {
  return {
    start,
    end: start + duration,
    duration,
    values,
  };
}


/**
 * Animation object. This is used by the animate function, user's don't manually
 * instantiate it, hence it's private.
 *
 * @constructor
 * @private
 *
 */
 // tween value format is:
 // * value at duration 0 of the tween
 // * difference between this value and the next tweens (delta value)
 // * previous tweens duration
 // * current tweens duration
 // Note: durations are measured from time 0, which is when the first tween
 // starts.
export default class Animation {
  currentIndex = 0;
  state = idle;

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

    const valuesAndDurations = initialTweenValues.map(value => [value, void 0]);
    this[tweens] = [
      createTween(0, defaultDuration, valuesAndDurations),
    ];

    // Maybe this a private helper, it get's used in interpolate
    this[maybeRound] = (() => {
      if (this.options.round) {
        return ::Math.round;
      }

      return identityFn;
    })();
  }

  get current() {
    return this[tweens][this.currentIndex];
  }

  get started() {
    return this.state !== idle;
  }

  start() {
    this.state = started;
    this.currentIndex = 0;
    this.currentDuration = void 0;
    this.startedAt = present();
    this.lastElapsed = 0;
    return this;
  }

  stop() {
    if (this.state === idle) {
      return;
    }

    if (this.options.gracefulStop && this.currentDuration > 0) {
      this.state = stopping;
      return;
    }

    this.state = idle;

    if (typeof this.onCompleteCallback === 'function') {
      this.onCompleteCallback();
    }
  }

  onTick(callback) {
    if (typeof callback !== 'function') {
      throw new Error('onTick callback must be a function');
    }

    this.onTickCallback = callback;
    return this;
  }

  onComplete(callback) {
    if (typeof callback !== 'function') {
      throw new Error('onComplete callback must be a function');
    }

    this.onCompleteCallback = callback;
    return this;
  }

  tween(targetValues, duration = this.defaultDuration) {
    if (!isNumberArray(targetValues)) {
      throw new Error('Can only animate arrays of numbers');
    }

    if (this[tweens][0].values.length !== targetValues.length) {
      throw new Error('All tweens must have the same number of targets');
    }

    const allTweens = this[tweens];
    const previousTween = allTweens[allTweens.length - 1];
    const values = new Array(targetValues.length);

    previousTween.values.forEach((prevValue, i) => {
      prevValue[1] = targetValues[i] - prevValue[0];
      values[i] = [
        targetValues[i],
        allTweens[0].values[i][0] - targetValues[i],
      ];
    });

    this[tweens].push(createTween(previousTween.end, duration, values));
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


  interpolate({values, start, duration}, time) {
    const p = (time - start) / duration;

    return this.current.values.map(([value, change]) => {
      if (change === 0) {
        return this[maybeRound](value);
      }

      return this[maybeRound](
        value + change * this.ease(p)
      );
    });
  }

  tick(now) {
    if (!this.started) {
      return;
    }

    let [tween, index, duration] = this.tweenAtTime(now);
    this.currentIndex = index;
    this.currentDuration = duration;

    if (tween === void 0) {
      // If we couldn't find a tween for this time, but the animation is started,
      // then it means that the animation has just completed.
      this.stop();
      return;
    }

    const allTweens = this[tweens];
    const endTime = allTweens[allTweens.length - 1].end;
    const elapsed = now - this.startedAt;
    const justLooped = Math.floor(elapsed / endTime) > Math.floor(this.lastElapsed / endTime);

    if (this.state === stopping && justLooped) {
      // This means that our time caused the animation to loop around, we've
      // passed through the start point since the last tick so it's safe to
      // reset to the first tween and then stop.
      this.currentIndex = 0;
      this.currentDuration = 0;
      tween = this[tweens][0];
      duration = 0;
      this.stop();
    }

    this.currentValue = this.interpolate(tween, duration);
    if (typeof this.onTickCallback === 'function') {
      this.onTickCallback(this.currentValue, now);
    }

    this.lastElapsed = elapsed;
  }

  timeToDuration(time) {
    if (this.startedAt !== void 0 && time < this.startedAt) {
      const msg = `Cannot find a tween before the animation starts: ${time} < ${this.startedAt}`;
      throw new Error(msg);
    }

    const allTweens = this[tweens];
    const longestDuration = allTweens[allTweens.length - 1].end;
    let duration = time - this.startedAt;

    if (duration >= longestDuration) {
      if (this.options.loop === false) {
        // It's after the animation would have stopped. This isn't an error
        // but there also isn't a valid duration that we can return.
        return void 0;
      }

      duration %= longestDuration;
    }

    return duration;
  }


  tweenAtTime(time) {
    const duration = this.timeToDuration(time);

    // Matches the start tween
    if (duration >= this[tweens][0].start && duration < this[tweens][0].end) {
      return [this[tweens][0], 0, duration];
    }

    const allTweens = this[tweens];
    for (let i = 1; i < allTweens.length; ++i) {
      const tween = allTweens[i];
      if (duration >= tween.start && duration < tween.end) {
        return [tween, i, duration];
      }
    }

    return [];
  }
}
