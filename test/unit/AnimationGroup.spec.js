import sinon from 'sinon';
import AnimationGroup from '../../src/AnimationGroup.js';


function createMockAnim(...tweenValues) {
  return {
    tweens: tweenValues.map(values => {
      return {values};
    }),

    atTime() {
      if (tweenValues.length === 0) {
        return void 0;
      }

      return tweenValues[0].map(values => values[0]);
    },
  };
}


describe('AnimationGroup', function() {
  it('throws an exception if the animations argument is not an array, or is empty', function() {
    /* eslint-disable no-new */
    expect(() => {
      new AnimationGroup('not an array');
    }).throw('You must supply AnimationGroups with at least one Animation');

    expect(() => {
      new AnimationGroup([]);
    }).throw('You must supply AnimationGroups with at least one Animation');
    /* eslint-enable no-new */
  });

  describe('atTime', function() {
    const options = {
      easing: 'linear',
      elasticity: 100,
      round: false,
    };

    function createGroup(aggregationMethod = 'combine') {
      const anim1 = createMockAnim([[1, 1], [2, 1]], [[2, -1], [3, -1]]);
      const anim2 = createMockAnim([[2, 2], [4, 4]], [[4, -2], [8, -4]]);
      return new AnimationGroup([anim1, anim2], Object.assign({aggregationMethod}, options));
    }

    it('combines when the aggregation method is "combine"', function() {
      const group = createGroup('combine');
      expect(group.atTime(0)).to.eql([3, 6]);
    });

    it('composes when the aggregation method is "compose"', function() {
      const group = createGroup('compose');
      expect(group.atTime(0)).to.eql([[1, 2], [2, 4]]);
    });

    it('returns just the value when the results contain a single value when composing', function() {
      const anim1 = createMockAnim([[1, 1]], [[2, -1]]);
      const anim2 = createMockAnim([[2, 2]], [[4, -2]]);

      const customOptions = Object.assign({aggregationMethod: 'compose'}, options);
      const group = new AnimationGroup([anim1, anim2], customOptions);
      expect(group.atTime(0)).to.eql([1, 2]);
    });
  });
});
