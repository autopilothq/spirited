import {createMockAnim} from '../../support/animation.helper.js';
import AnimationGroup from '../../../src/animation/Group.js';

const defaultTweens1 = [
  [[1, 1], [2, 1]],
  [[2, -1], [3, -1]],
];

const defaultTweens2 = [
  [[2, 2], [4, 4]],
  [[4, -2], [8, -4]],
];

function createGroup(aggregationMethod = 'combine', tweens1, tweens2) {
  const anim1 = createMockAnim(tweens1 || defaultTweens1);
  const anim2 = createMockAnim(tweens2 || defaultTweens2);
  return new AnimationGroup([anim1, anim2], Object.assign({aggregationMethod}, {
    easing: 'linear',
    elasticity: 100,
    round: false,
  }));
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

  it('has a getter for the endTime', function() {
    const group = createGroup('combine');
    expect(group.endTime).to.eql(group.animations[1].lastTween.end);
  });

  describe('atTime', function() {
    it('combines when the aggregation method is "combine"', function() {
      const group = createGroup('combine');
      expect(group.atTime(0)).to.eql([3, 6]);
    });

    it('composes when the aggregation method is "compose"', function() {
      const group = createGroup('compose');
      expect(group.atTime(0)).to.eql([[1, 2], [2, 4]]);
    });

    it('returns just the value when the results contain a single value when composing', function() {
      const group = createGroup('compose',
        [[[1, 1]], [[2, -1]]],
        [[[2, 2]], [[4, -2]]]
      );
      expect(group.atTime(0)).to.eql([1, 2]);
    });
  });
});
