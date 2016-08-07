
/*
import { default as animatem compose, combine } from 'animate';
const shake = animate([0], 200, { loop: true, easing: 'easeInOutQuad' })
                  .tween([10], 400)
                  .tween([-10]);


const moveTo = animate([0, 0], 200, { loop: true, easing: 'easeInOutQuad' })
                  .tween([200, 150], 400)
                  .tween([200, 50]);

// Combining animations
const shakeNMove = combine(moveTo, shake)
                        .onTick(([x, y], shape) => {
                          shape.bbox.minX = x;
                          shape.bbox.minY = y;
                        });

// Composing animations
const shakeNMove = compose(moveTo, shake)
                        .onTick((shakeOffset, movePosition, shape) => {
                          shape.bbox.minX = x;
                          shape.bbox.minY = y;
                        });

shapeShaker = shake(shape)
shapeShaker.start()

shapeShakeNMove = shakeNMove(shape)
shapeShakeNMove.start()

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
export default (initialTweenValues, defaultDuration, options = {}) => {
  console.error('TODO: Animate', initialTweenValues, defaultDuration, options);
  // Create the new Animation
  // Push it into the animations list
  // return it
};

export const compose = (...animations) => {
  console.error('TODO: COMPOSE', animations);
};

export const combine = (...animations) => {
  console.error('TODO: COMBINE', animations);
};
