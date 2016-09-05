/**
 * Creates a tween object. This is used internally by Animation.
 *
 * @param  {Number} start    The time when the start will start, counting from
 *                           time 0, which is when the first tween will start.
 * @param  {Number} duration The duration (in ms) of this tween
 * @param  {Array} values    The array of values for this tween. This is usually
 *                           actually an array of pairs of the form: [value, deltaToTheNextValue]
 * @return {Object}          The Tween object.
 * @private
 */
export default (start, duration, values) => {
  return {
    start,
    end: start + duration,
    duration,
    values,
  };
};
