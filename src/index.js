import Animation from './Animation.js';
import AnimationGroup from './AnimationGroup.js';
import Playback from './Playback.js';

/**
 * Returns a function that groups the desires animations together using aggregationMethod
 * The function can be called to generate a playback group for all of the animations.
 *
 * @param  {Array} animations         [description]
 * @param  {String} aggregationMethod [description]
 * @return {Playback}                 [description]
 */
const makePlaybackGroup = (animations, aggregationMethod) => {
  if (typeof aggregationMethod !== 'string') {
    throw new Error('You must provide an aggregation method for the group');
  }

  return (...entities) => {
    const animGroup = new AnimationGroup(animations, {aggregationMethod});
    return Playback.create(animGroup, entities);
  };
};


/*
import { default as animatem compose, combine } from 'animate';
const shake = animate([0], 200, { loop: true, easing: 'easeInOutQuad' })
                  .tween([10], 400)
                  .tween([-10]);


const moveTo = animate([0, 0], 200, { loop: true, easing: 'easeInOutQuad' })
                  .tween([200, 150], 400)
                  .tween([200, 50]);

// Combining animations
// Copies the behaviour of animations but not it's state (if it had already been started)
const shakeNMove = combine(moveTo, shake)
                        .onTick(([x, y], shape) => {
                          shape.bbox.minX = x;
                          shape.bbox.minY = y;
                        });

// Composing animations
// Copies the behaviour of animations but not it's state (if it had already been started)
const shakeNMove = compose(moveTo, shake)
                        .onTick((shakeOffset, movePosition, shape) => {
                          shape.bbox.minX = x;
                          shape.bbox.minY = y;
                        });

shapeShaker = shake(shape)
  .onTick((value, time) => { ... })
  .onComplete(() => { ... })
  .start()


shapeShakeNMove = shakeNMove(shape)
  .onTick((value, time) => { ... })
  .onComplete(() => { ... })
  .start()

animate.tick()
shapeShaker.stop();
shapeShaker.destroy();
shapeShaker.tick(time);     // <== private API
*/


/**
 * [default description]
 * @param  {Array} initialTweenValues [description]
 * @param  {Number} defaultDuration   [description]
 * @param  {[type]} options =             {} [description]
 * @return {Animation}         [description]
 */
export const animate = (initialTweenValues, defaultDuration, options = {}) => {
  return new Animation(initialTweenValues, defaultDuration, options);
};

/**
 * [description]
 * @param  {Array} animations        [description]
 * @param  {String} aggregationMethod [description]
 * @return {AnimationGroup}         [description]
 */
export const group = (animations, aggregationMethod) => {
  return new AnimationGroup(animations, {aggregationMethod});
};

/**
 * [description]
 * @param  {[type]} animations [description]
 * @return {[type]}            [description]
 */
export const compose = (...animations) => {
  return makePlaybackGroup(animations, 'compose');
};

/**
 * [description]
 * @param  {[type]} animations [description]
 * @return {[type]}            [description]
 */
export const combine = (...animations) => {
  return makePlaybackGroup(animations, 'combine');
};

export default animate;

if (window) {
  // Ugly temp hack for testing some stuff
  window.combine = combine;
  window.compose = compose;
  window.animate = animate;
}
