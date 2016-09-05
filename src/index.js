import Animation from './animation/Animation.js';
import AnimationGroup from './animation/Group.js';
import Playback from './playback/Playback.js';

/**
 * Returns a function that groups the desires animations together using aggregationMethod
 * The function can be called to generate a playback group for all of the animations.
 *
 * @param  {Array} animations         [description]
 * @param  {String} aggregationMethod [description]
 * @return {Playback}                 [description]
 */
const makePlaybackGroup = (animations, aggregationMethod, {gracefulStop} = {}) => {
  if (typeof aggregationMethod !== 'string') {
    throw new Error('You must provide an aggregation method for the group');
  }

  const animGroup = new AnimationGroup(animations, {aggregationMethod});

  return (...entities) => {
    return Playback.create(animGroup, entities, {gracefulStop});
  };
};


/**
 * [default description]
 *
 * @param  {Array} initialTweenValues [description]
 * @param  {Number} defaultDuration   [description]
 * @param  {Object} options           [description]
 * @return {Animation}                [description]
 */
export const animate = (initialTweenValues, defaultDuration, options) => {
  return new Animation(initialTweenValues, defaultDuration, options);
};

/**
 * [default description]
 *
 * @param  {Animation} animation [description]
 * @param  {Array} entities  [description]
 * @param  {Object} options   [description]
 * @return {Playback}         [description]
 */
export const playback = (animation, entities, options) => {
  return Playback.create(animation, entities, options);
};

/**
 * [default description]
 *
 * @param  {Array} animations         [description]
 * @param  {String} aggregationMethod [description]
 * @return {AnimationGroup}           [description]
 */
export const group = (animations, aggregationMethod) => {
  return new AnimationGroup(animations, {aggregationMethod});
};

/**
 * [default description]
 *
 * @param  {Array} animations  [description]
 * @return {AnimationGroup}    [description]
 */
export const compose = (...animations) => {
  return makePlaybackGroup(animations, 'compose');
};

/**
 * [default description]
 *
 * @param  {Array} animations  [description]
 * @return {AnimationGroup}    [description]
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
  window.playback = playback;
}
