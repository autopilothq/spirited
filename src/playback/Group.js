import {EventEmitter} from 'drip';
import present from 'present';
import GroupError from './GroupError.js';

// Valid Animation states
const started = Symbol('STARTED');
const stopping = Symbol('STOPPING');
const idle = Symbol('IDLE');

// Private symbols and helpers
const validAggregationMethods = Object.freeze([
  'combine', 'compose',
]);


/**
 * @desc @TODO
 *
 * User's don't manually instantiate it, hence it's private.
 *
 * @private
 * @example TODO
 *
 */
export default class PlaybackGroup extends EventEmitter {
  /**
   * Indicates the current playback state.
   *
   * @property {started|stopping|idle} state - The current playback state
   * @readonly
   */
  state = idle;


  /**
   * Playback constructor.
   *
   * @param  {Playback} playbacks   The Playbacks to play
   * @param  {Array} entities       Related entities that will be passed to the onTick callback
   * @param  {Object} [options={}]  See {@link defaultOptions} for the valid options
   * @return {PlaybackGroup}        The new PlaybackGroup
   *
   */
  constructor(playbacks, {aggregationMethod} = {}) {
    if (!Array.isArray(playbacks)) {
      throw new GroupError('The first parameter of an PlaybackGroup must be an Array');
    }

    if (!validAggregationMethods.includes(aggregationMethod)) {
      throw new GroupError('Invalid aggregationMethod method for PlaybackGroup. ' +
      `Got ${aggregationMethod}. Expected one of: ${validAggregationMethods.join(', ')}`);
    }

    super();

    // Readonly for safety
    Object.defineProperties(this, {
      /**
       * @property {String} aggregationMethod - Either 'compose' or 'combine'
       * @memberof PlaybackGroup#
       * @readonly
       */
      aggregationMethod: {value: aggregationMethod},

      /**
       * @property {Set} animations - The animations that this group contains.
       * @memberof PlaybackGroup#
       * @readonly
       */
      playbacks: {value: playbacks},

      /**
       * @property {Array} lastResult - The results from the last tick
       * @memberof PlaybackGroup#
       * @readonly
       */
      lastResult: {value: []},
    });

    this.resize();
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
    for (const playback of this.playbacks) {
      playback.destroy();
    }
  }

  /**
   * @TODO
   * @return {Number} @TODO
   * @private
   *
   */
  get maxCardinality() {
    // if (this.aggregationMethod === 'compose') {
    //   return this.playbacks.length;
    // }

    if (this.playbacks.length === 0) {
      return 0;
    }

    let maxCardinality = -1;

    for (const playback of this.playbacks) {
      if (playback.cardinality > maxCardinality) {
        maxCardinality = playback.cardinality;
      }
    }

    if (maxCardinality === -1) {
      throw new GroupError('Could not calculate the cardinality of the playback group');
    }

    return maxCardinality;
  }

  /**
   * @desc An internal helper to regenerate the last resultset and total duration.
   *
   * @return {undefined}
   * @throws {GroupError}
   * @private
   */
  resize() {
    this.lastResult.length = this.maxCardinality;
  }

  /**
   * @desc Add an Playback to this group and start it.
   *
   * @param {Playback} playback   The playback to add
   * @return {PlaybackGroup}       Returns this, for chaining
   *
   */
  add(playback) {
    if (this.started && !playback.started) {
      playback.start(present());
    }

    this.playbacks.push(playback);
    this.resize();
    return this;
  }

  /**
   * @desc Remove an Playback from this group and stop it.
   *
   * @param {Playback} playback   The playback to remove
   * @return {PlaybackGroup}     Returns this, for chaining
   *
   */
  remove(playback) {
    const i = this.playbacks.indexOf(playback);
    if (i > -1) {
      this.playbacks.splice(i, 1);
      this.resize();
    }

    playback.stop();
    return this;
  }

  /**
   * Begin playback
   *
   * @param  {Number} time [description]
   * @return {PlaybackGroup} Self
   * @throws {PlaybackError}
   * @throws {GroupError}
   */
  start(time) {
    if (this.state !== idle) {
      throw new GroupError('PlaybackGroup cannot be started as it\'s already running');
    }

    for (const playback of this.playbacks) {
      playback.start(time);
    }

    this.state = started;
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
   * End playback, either immediately (ignoreGraceful=true) or the next time
   * that it loops. By default ignoreGraceful is false, this means that Playback
   * will usually finish on the initial value.
   *
   * @param {boolean} [ignoreGraceful=false] If true, the playback will be immediately stopped.
   * @return {PlaybackGroup} Self
   */
  stop(ignoreGraceful = false) {
    let waitingOn = 0;
    const maybeFinished = () => {
      if (waitingOn === 0) {
        // decrimenting waitingOn once more guards against maybeFinished
        // being called after we have emitted the 'end' event.
        waitingOn -= 1;
        this.state = idle;
        this.emit('end');
      }
    };
    const stopPlayback = () => {
      waitingOn -= 1;
      maybeFinished();
    };
    let i = this.playbacks.length - 1;
    this.state = stopping;

    while (i >= 0) {
      const playback = this.playbacks[i];
      i -= 1;

      playback.stop(ignoreGraceful);
      if (playback.stopping) {
        // Playback isn't ready to stop yet. Let's wait until it is.
        waitingOn += 1;
        playback.once('end', stopPlayback);
      }
    }

    maybeFinished();
    return this;
  }

  /**
   * Get the combined value for the group at elapsed time. This is not public,
   * it is a helper of {@link PlaybackGroup#tick}
   *
   * @param  {Number} time      Timestamp
   * @return {Array}            Either an Array of Number values, or undefined
   * @private
   */
  combine(time) {
    let hasResults = false;
    let i = this.playbacks.length - 1;
    this.lastResult.fill(0);

    while (i >= 0) {
      const playback = this.playbacks[i];
      i -= 1;

      const results = playback.tick(time);
      if (results.length) {
        hasResults = true;

        results.forEach((result, r) => {
          this.lastResult[r] += result;
        });
      }
    }

    return hasResults ? this.lastResult : [];
  }

  /**
   * Get the composed value for the group at elapsed time. This is not public,
   * it is a helper of {@link PlaybackGroup#tick}
   *
   * @param  {Number} time      Timestamp
   * @return {Array}            Either an Array of Number values, or undefined
   * @private
   */
  compose(time) {
    let hasResults = false;
    let i = this.playbacks.length - 1;

    while (i >= 0) {
      const playback = this.playbacks[i];
      const result = playback.tick(time);

      if (result.length) {
        hasResults = true;
        this.lastResult[i] = result.length > 1 ? result : result[0];
      } else {
        this.lastResult[i] = void 0;
      }

      i -= 1;
    }

    return hasResults ? this.lastResult : [];
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

    const result = this.aggregationMethod === 'combine'
                      ? this.combine(time)
                      : this.compose(time);

    if (result.length) {
      this.emit('tick', ...result, time);
    }

    return result;
  }
}
