import sinon from 'sinon';
import PlaybackGroup from '../../src/PlaybackGroup.js';


function createMockAnim(...tweens) {
  return {
    tweens: tweens.map(values => {
      return {values};
    }),
    playback() {
      return {
        start: sinon.spy(),

        tick() {
          this.currentValue = tweens[0].map(values => values[0]);
          return this.currentValue;
        },
      };
    },
  };
}


describe('PlaybackGroup', function() {
  it('throws an exception if the animations argument is not an array, or is empty', function() {
    /* eslint-disable no-new */
    expect(() => {
      new PlaybackGroup('not an array');
    }).throw('You must supply PlaybackGroups with at least one Animation');

    expect(() => {
      new PlaybackGroup([]);
    }).throw('You must supply PlaybackGroups with at least one Animation');
    /* eslint-enable no-new */
  });

  it('throws an exception if the entities argument is not an array', function() {
    /* eslint-disable no-new */
    expect(() => {
      new PlaybackGroup([{}], 'entities');
    }).throw('The entities parameter must be an Array');
    /* eslint-enable no-new */
  });

  it('starts all the playbacks when the group is started', function() {
    const anim1 = createMockAnim([[1, 1], [2, -1]]);
    const anim2 = createMockAnim([[2, 2], [4, -2]]);
    const group = new PlaybackGroup([anim1, anim2], [], 'combine');
    group.start();

    for (const playback of group.playbacks) {
      expect(playback.start).to.have.been.called;
    }
  });

  it('wait until all playbacks are stopped before setting the group state to idle');
  it('triggers the onComplete callback once all playbacks have completed');

  describe('tick', function() {
    function createGroup(aggregationMethod = 'combine') {
      const anim1 = createMockAnim([[1, 1], [2, 1]], [[2, -1], [3, -1]]);
      const anim2 = createMockAnim([[2, 2], [4, 4]], [[4, -2], [8, -4]]);
      return new PlaybackGroup([anim1, anim2], [], aggregationMethod);
    }

    it('returns [] when the group is not started', function() {
      const group = createGroup();
      expect(group.state.toString()).to.eql('Symbol(IDLE)');
      expect(group.tick(1234)).to.eql([]);
    });

    it('combines when the aggregation method is "combine"', function() {
      const onTick = sinon.spy();
      const group = createGroup('combine');
      group.onTick(onTick).start().tick(1234);
      expect(onTick).to.have.been.calledWith(3, 6, 1234);
    });

    it('composes when the aggregation method is "compose"', function() {
      const onTick = sinon.spy();
      const group = createGroup('compose');
      group.onTick(onTick).start().tick(1234);
      expect(onTick).to.have.been.calledWith([1, 2], [2, 4], 1234);
    });

    it('returns just the value when the results contain a single value when composing', function() {
      const onTick = sinon.spy();
      const anim1 = createMockAnim([[1, 1]], [[2, -1]]);
      const anim2 = createMockAnim([[2, 2]], [[4, -2]]);
      const group = new PlaybackGroup([anim1, anim2], [], 'compose');

      group.onTick(onTick).start().tick(1234);
      expect(onTick).to.have.been.calledWith(1, 2, 1234);
    });
  });
});
