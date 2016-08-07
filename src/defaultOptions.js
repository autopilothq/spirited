/**
 * Default options for an animation
 * @name defaultOptions
 * @type {Object}
 * @private
 */
export default {
  /**
   * If gracefulStop is true then the animation will continue to run
   * to completion (until it reaches it's initial tween again) before stopping.
   *
   * @name gracefulStop
   * @type {Boolean}
   */
  gracefulStop: true,

  /**
   * If true the animated values will be rounded to the nearest whole integer.
   *
   * @name round
   * @type {Boolean}
   */
  round: true,

  /**
   * If true the animation will loop until it is stopped.
   *
   * @name loop
   * @type {Boolean}
   */
  loop: true,
};
