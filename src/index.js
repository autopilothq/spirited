import Animation from './animation/Animation.js';
import AnimationGroup from './animation/Group.js';
import Playback from './playback/Playback.js';
import PlaybackGroup from './playback/Group.js';


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
 * @param  {Object} options   [description]
 * @return {Playback}         [description]
 */
export const play = (animation, options) => {
  return new Playback(animation, options);
};

/**
 * Returns a function that groups the desires animations together using aggregationMethod
 * The function can be called to generate a playback group for all of the animations.
 *
 * @param  {Array} animations         [description]
 * @param  {String} aggregationMethod [description]
 * @return {PlaybackGroup}            [description]
 */
export const group = (animations, aggregationMethod, {gracefulStop} = {}) => {
  if (typeof aggregationMethod !== 'string') {
    throw new Error('You must provide an aggregation method for the group');
  }

  const playbacks = [];

  if (animations.length) {
    const animGroup = new AnimationGroup(animations, {aggregationMethod});
    const playback = new Playback(animGroup, {gracefulStop});
    playbacks.push(playback);
  }

  return new PlaybackGroup(playbacks, {aggregationMethod});
};


/**
 * [default description]
 *
 * @param  {Array} animations  [description]
 * @return {PlaybackGroup}    [description]
 */
export const compose = (...animations) => {
  return group(animations, 'compose');
};

/**
 * [default description]
 *
 * @param  {Array} animations  [description]
 * @return {PlaybackGroup}    [description]
 */
export const combine = (...animations) => {
  return group(animations, 'combine');
};

export default animate;
