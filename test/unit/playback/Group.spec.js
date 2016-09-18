import {EventEmitter} from 'drip';
import sinon from 'sinon';
import present from 'present';
import Playback from '../../../src/playback/Playback.js';
import PlaybackGroup from '../../../src/playback/Group.js';
import Animation from '../../../src/animation/Animation.js';
import {createMockAnim} from '../../support/animation.helper.js';



class MockPlayback extends EventEmitter {
  cardinality = 0;

  constructor(started = false) {
    super();
    this.started = started;
    this.start = sinon.spy();
    this.stop = sinon.spy();
  }
}

function createMockPlayback(started = false) {
  return new MockPlayback(started);
}

describe('PlaybackGroup', function() {
  it('throws an error if you don\'t pass an array as the first arg', function() {
    expect(() => {
      /* eslint-disable no-new */
      new PlaybackGroup('not an array');
      /* eslint-enable no-new */
    }).throw('The first parameter of an PlaybackGroup must be an Array');
  });

  it('throws an error if you don\'t provide a valid aggregationMethod', function() {
    expect(() => {
      /* eslint-disable no-new */
      new PlaybackGroup([]);
      /* eslint-enable no-new */
    }).throw('Invalid aggregationMethod method for PlaybackGroup. ' +
      `Got ${void 0}. Expected one of: combine, compose`);
  });

  it('it adds playbacks passed to the contructor', function() {
    const playback1 = createMockPlayback();
    const playback2 = createMockPlayback();
    const group = new PlaybackGroup([playback1, playback2], {aggregationMethod: 'combine'});
    expect(group.playbacks).to.eql([playback1, playback2]);
  });

  describe('add', function() {
    let group, playback;

    beforeEach(function() {
      playback = createMockPlayback();
      group = new PlaybackGroup([], {aggregationMethod: 'combine'});
    });

    it('adds the playback to the list of playbacks', function() {
      group.add(playback);
      expect(group.playbacks[0]).to.eql(playback);
    });

    it('starts the new playback if the group is started', function() {
      group.start(present());
      group.add(playback);
      expect(playback.start).to.have.been.called;
    });

    it('does not start the new playback if the playback is already started', function() {
      playback.started = true;
      group.add(playback);
      expect(playback.start).to.have.not.been.called;
    });

    it('does not start the new playback if the group is not started', function() {
      group.add(playback);
      expect(playback.start).to.have.not.been.called;
    });
  });

  describe('remove', function() {
    let group, playback1, playback2;

    beforeEach(function() {
      playback1 = createMockPlayback();
      playback2 = createMockPlayback();
      group = new PlaybackGroup([playback1, playback2], {aggregationMethod: 'combine'});
      group.remove(playback1);
    });

    it('removes the playback from the list of playbacks', function() {
      expect(group.playbacks).to.eql([playback2]);
    });

    it('stops the playback', function() {
      expect(playback1.stop).to.have.been.called;
    });
  });

  describe('start', function() {
    let group, playback1, playback2;

    beforeEach(function() {
      playback1 = createMockPlayback();
      playback2 = createMockPlayback();
      group = new PlaybackGroup([playback1, playback2], {aggregationMethod: 'combine'});
      group.start(present());
    });

    it('throws an error if the group is not idle', function() {
      expect(() => {
        /* eslint-disable no-new */
        group.start(present());
        /* eslint-enable no-new */
      }).throw('PlaybackGroup cannot be started as it\'s already running');
    });

    it('starts all playbacks', function() {
      expect(playback1.start).to.have.been.called;
      expect(playback2.start).to.have.been.called;
    });
  });

  describe('stop', function() {
    let group, playback1, playback2;

    beforeEach(function() {
      playback1 = createMockPlayback();
      playback2 = createMockPlayback();
      group = new PlaybackGroup([playback1, playback2], {aggregationMethod: 'combine'});
      group.start(present());
    });

    it('calls stop on each playback', function() {
      group.stop();
      expect(playback1.stop).to.have.been.called;
      expect(playback2.stop).to.have.been.called;
    });

    it('honours the ignoreGraceful arg', function() {
      group.stop(true);
      expect(playback1.stop).to.have.been.calledWith(true);
      expect(playback2.stop).to.have.been.calledWith(true);
    });

    it('waits until all playbacks have stopped before emitting "end"', function() {
      const groupEnded = sinon.spy();
      group.on('end', groupEnded);

      // Force playback1 to appear to be not ready to stop yet
      playback1.stopping = true;

      group.stop();
      expect(group.state.toString()).to.eql('Symbol(STOPPING)');
      expect(groupEnded).to.have.not.been.called;
      playback1.emit('end');
      expect(groupEnded).to.have.been.called;
    });
  });

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
    const playback1 = new Playback(anim1);
    const anim2 = createMockAnim(tweens2 || defaultTweens2);
    const playback2 = new Playback(anim2);
    return new PlaybackGroup([playback1, playback2], {aggregationMethod});
  }

  describe('tick: composed', function() {
    let group;

    beforeEach(function() {
      group = createGroup('compose');
      group.start(present());
    });

    it('emits tick with the composed results', function() {
      const time = present();
      group.once('tick', (first, second, tickTime) => {
        expect(tickTime).to.eql(time);
        expect(first).to.eql([1, 2]);
        expect(second).to.eql([2, 4]);
      });

      group.tick(time);
    });

    it('returns the composed results', function() {
      expect(group.tick(present())).to.eql([[1, 2], [2, 4]]);
    });
  });

  describe('tick: combined', function() {
    let group;

    beforeEach(function() {
      group = createGroup('combine');
      group.start(present());
    });

    it('emits tick with the combined results', function() {
      const time = present();
      group.once('tick', (first, second, tickTime) => {
        expect(tickTime).to.eql(time);
        expect(first).to.eql(3);
        expect(second).to.eql(6);
      });

      group.tick(time);
    });

    it('returns the combined results', function() {
      expect(group.tick(present())).to.eql([3, 6]);
    });
  });
});
