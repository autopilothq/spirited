import Animation from './animation/Animation.js';
import AnimationGroup from './animation/Group.js';
import Playback from './playback/Playback.js';
import PlaybackGroup from './playback/Group.js';

/**
 * Returns a function that groups the desires animations together using aggregationMethod
 * The function can be called to generate a playback group for all of the animations.
 *
 * @param  {Array} animations         [description]
 * @param  {String} aggregationMethod [description]
 * @return {Playback}                 [description]
 */
const makeAnimationGroup = (animations, aggregationMethod, {gracefulStop} = {}) => {
  if (typeof aggregationMethod !== 'string') {
    throw new Error('You must provide an aggregation method for the group');
  }

  const animGroup = new AnimationGroup(animations, {aggregationMethod});

  return (...entities) => {
    const playback = new Playback(animGroup, entities, {gracefulStop});
    return new PlaybackGroup([playback], {aggregationMethod});
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
  return new Playback(animation, entities, options);
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
  return makeAnimationGroup(animations, 'compose');
};

/**
 * [default description]
 *
 * @param  {Array} animations  [description]
 * @return {AnimationGroup}    [description]
 */
export const combine = (...animations) => {
  return makeAnimationGroup(animations, 'combine');
};

export default animate;
