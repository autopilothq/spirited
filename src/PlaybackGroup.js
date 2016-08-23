// Animation states
const started = Symbol('STARTED');
const stopping = Symbol('STOPPING');
const idle = Symbol('IDLE');

const validAggregationMethods = Object.freeze([
  'combine', 'compose',
]);

/**
 * Looks at an array of animations and works out which returns the max
 * cardinality of all of their tween values.
 *
 * @param  {Array} animations An array of Animation objects
 * @return {Number}           The max cardinality, as an integer
 */
const largestValueCardinality = (animations) => {
  let max = -1;

  for (const {tweens} of animations) {
    if (tweens[0].values.length > max) {
      max = tweens[0].values.length;
    }
  }

  return max;
};


/**
 * A group of Playbacks. This allows you to progress a number of Playbacks at
 * once but only have on onTick function fix with the aggregate result. Exactly
 * how the aggregate is calculated by using the aggregationMethod parameter.
 *
 * User's don't manually instantiate it, hence it's private.
 *
 * @TODO docs for parameters
 * @TODO docs for entities
 * @TODO docs for aggregationMethod
 *
 * @constructor
 * @private
 *
 */
export default class PlaybackGroup {
  state = idle;

  constructor(animations, entities, aggregationMethod) {
    if (!Array.isArray(animations) || animations.length === 0) {
      throw new Error('You must supply PlaybackGroups with at least one Animation');
    }

    if (!Array.isArray(entities)) {
      throw new Error('The entities parameter must be an Array');
    }

    if (!validAggregationMethods.includes(aggregationMethod)) {
      throw new Error(`Invalid aggregationMethod method for PlaybackGroup:
        Got ${aggregationMethod}, expected one of ${validAggregationMethods.join(', ')}`);
    }

    // We don't pass entities to the playbacks as we don't want to duplicate it
    // N times. Instead we'll store it in the group itself.
    this.playbacks = animations.map(anim => anim.playback());
    this.entities = entities;
    this.aggregationMethod = aggregationMethod;

    const resultsSize = this.aggregationMethod === 'combine'
                          ? largestValueCardinality(animations)
                          : animations.length;

    this.currentValue = new Array(resultsSize);

    // TODO trigger onComplete handler when all of the (running) playbacks complete
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

    for (const playback of this.playbacks) {
      playback.start();
    }

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

    for (const playback of this.playbacks) {
      playback.stop();
    }

    if (this.playbacks.some(playback => playback.stopping)) {
      this.state = stopping;
    } else {
      this.state = idle;
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

    this.onTickCallback = callback;
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
   * [combine description]
   * @param  {[type]} now [description]
   * @return {[type]}     [description]
   * @private
   */
  combine(now) {
    this.currentValue.fill(0);

    for (const playback of this.playbacks) {
      playback.tick(now).forEach((value, i) => {
        this.currentValue[i] += value;
      });
    }

    return this.currentValue;
  }

  /**
   * [compose description]
   * @param  {[type]} now [description]
   * @return {[type]}     [description]
   * @private
   */
  compose(now) {
    this.playbacks.forEach((playback, i) => {
      const result = playback.tick(now);
      this.currentValue[i] = result.length > 1 ? result : result[0];
    });

    return this.currentValue;
  }

  /**
   * [tick description]
   * @param  {[type]} now [description]
   * @return {[type]}     [description]
   */
  tick(now) {
    if (!this.started) {
      return [];
    }

    let results;

    if (this.aggregationMethod === 'combine') {
      results = this.combine(now);
    } else {
      results = this.compose(now);
    }

    if (this.onTickCallback) {
      this.onTickCallback(...results, now, ...this.entities);
    }

    return results;
  }
}
