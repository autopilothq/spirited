/**
 * Looks at an array of animations ands returns:
 *  1. the max cardinality of all of their tween values.
 *  2. the latest totalDuration of the all the animations.
 *
 * @TODO This is a clumsy name, would be great to come up with something pithy
 *
 * @param  {Array} animations An array of Animation objects
 * @return {Object}           An object with two properties, cardinality, and totalDuration.
 *                            Both properties will be integers.
 * @private
 */
export default (animations) => {
  if (animations.size === 0) {
    return {cardinality: 0, totalDuration: 0};
  }

  let cardinality = -1;
  let totalDuration = -1;

  for (const anim of animations) {
    if (anim.cardinality > cardinality) {
      cardinality = anim.cardinality;
    }

    if (anim.lastTween.end > totalDuration) {
      totalDuration = anim.lastTween.end;
    }
  }

  if (cardinality === -1 || totalDuration === -1) {
    throw new Error(`Could not calculate cardinality or totalDuration for animation group:
      {cardinality: ${cardinality}, totalDuration: ${totalDuration}} `);
  }

  return {cardinality, totalDuration};
};
