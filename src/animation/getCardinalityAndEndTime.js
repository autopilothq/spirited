/**
 * Looks at an array of animations ands returns:
 *  1. the max cardinality of all of their tween values.
 *  2. the latest endTime of the all the animations.
 *
 * @param  {Array} animations An array of Animation objects
 * @return {Object}           An object with two properties, cardinality, and endTime.
 *                            Both properties will be integers.
 */
export default (animations) => {
  let cardinality = -1;
  let endTime = -1;

  for (const {tweens, lastTween} of animations) {
    if (tweens[0].values.length > cardinality) {
      cardinality = tweens[0].values.length;
    }

    if (lastTween.end > endTime) {
      endTime = lastTween.end;
    }
  }

  if (cardinality === -1 || endTime === -1) {
    throw new Error(`Could not calculate cardinality or endTime for animation group:
      {cardinality: ${cardinality}, endTime: ${endTime}} `);
  }

  return {cardinality, endTime};
};
