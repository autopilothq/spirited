import * as easingFunctions from 'easing-utils';


/**
 * @desc Creates a function that will ease time values (between 0 and 1) using a specific
 * easing function and elasticity.
 *
 * The valid easing functions are:
 * * linear
 * * easeInSine
 * * easeOutSine
 * * easeInOutSine
 * * easeInQuad
 * * easeOutQuad
 * * easeInOutQuad
 * * easeInCubic
 * * easeOutCubic
 * * easeInOutCubic
 * * easeInQuart
 * * easeOutQuart
 * * easeInOutQuart
 * * easeInQuint
 * * easeOutQuint
 * * easeInOutQuint
 * * easeInExpo
 * * easeOutExpo
 * * easeInOutExpo
 * * easeInCirc
 * * easeOutCirc
 * * easeInOutCirc
 * * easeInBack
 * * easeOutBack
 * * easeInOutBack
 * * easeInElastic
 * * easeOutElastic
 * * easeInOutElastic
 * * easeOutBounce
 * * easeInBounce
 * * easeInOutBounce
 *
 * @see http://goo.gl/K6YGiI for examples of the various easing functions
 *
 * @param  {String} easing     The name of the function to use
 * @return {Function}            The easing function.
 */
export default (easing) => {
  if (!easingFunctions.hasOwnProperty(easing)
        || typeof easingFunctions[easing] !== 'function') {
    throw new Error(`${easing} is not a valid easing method`);
  }

  const ease = easingFunctions[easing];
  return function(time) {
    return ease(time);
  };
};
