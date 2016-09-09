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
    round: false,
  }));
}


describe('AnimationGroup', function() {
  it('throws an exception if the animations argument is not an array', function() {
    /* eslint-disable no-new */
    expect(() => {
      new AnimationGroup('not an array');
    }).throw('The first parameter of an AnimationGroup must be an Array');
    /* eslint-enable no-new */
  });

  it('has a getter for the totalDuration', function() {
    const group = createGroup('combine');
    let lastAnim = group.animations.values();
    lastAnim = lastAnim.next().value;
    expect(group.totalDuration).to.eql(lastAnim.lastTween.end);
  });

  describe('atTime', function() {
    it('returns undefined for an empty animation group', function() {
      const group = new AnimationGroup([], {
        aggregationMethod: 'combine',
        easing: 'linear',
      });

      expect(group.atTime(0)).to.eql(void 0);
    });

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

  describe('add', function() {
    let group, anim1, anim2, anim3;

    beforeEach(function() {
      group = createGroup('combine');

      const anims = new Array(...group.animations);
      anim1 = anims[0];
      anim2 = anims[1];
      anim3 = createMockAnim([
        [[10, 2], [20, 4]],
        [[30, -2], [40, -4]],
      ], 400);

      group.add(anim3);
    });

    it('recalculates the total duration', function() {
      expect(group.totalDuration).to.eql(800);
    });

    it('adds the animation to the collection', function() {
      const anims = new Array(...group.animations);
      expect(anims[0]).to.eql(anim1);
      expect(anims[1]).to.eql(anim2);
      expect(anims[2]).to.eql(anim3);
    });

    it('includes the new animation\'s values when calling atTime', function() {
      expect(group.combine(0)).to.eql([13, 26]);
      expect(group.compose(0)).to.eql([[1, 2], [2, 4], [10, 20]]);
    });

    it('throws an exception if the animation is already in the group');
  });

  describe('remove', function() {
    let group, anim1, anim2, anim3;

    beforeEach(function() {
      group = createGroup('combine');
      const anims = new Array(...group.animations);
      anim1 = anims[0];
      anim2 = anims[1];
      anim3 = createMockAnim([
        [[10, 2], [20, 4]],
        [[30, -2], [40, -4]],
      ], 400);

      group.add(anim3);
      group.remove(anim3);
    });

    it('recalculates the total duration', function() {
      expect(group.totalDuration).to.eql(400);
    });

    it('removes the animation from the collection', function() {
      const anims = new Array(...group.animations);
      expect(anims[0]).to.eql(anim1);
      expect(anims[1]).to.eql(anim2);
      expect(anims[2]).to.eql(void 0);
    });

    it('does not include the old animation\'s values when calling atTime', function() {
      expect(group.combine(0)).to.eql([3, 6]);
      expect(group.compose(0)).to.eql([[1, 2], [2, 4]]);
    });
  });
});
