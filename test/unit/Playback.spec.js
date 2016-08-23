import sinon from 'sinon';
import Playback from '../../src/Playback.js';
import Animation from '../../src/Animation.js';


describe('Playback: initial state', function() {
  let playback;

  beforeEach(function() {
    playback = new Playback([1, 2], 100, {
      easing: 'easeInOutElastic',
      elasticity: 100,
      round: false,
      loop: true,
      foo: 'bar',
    });
  });

  it('defaults the state to idle', function() {
    expect(playback.state.toString()).to.eql('Symbol(IDLE)');
  });
});

describe('Playback: Running state', () => {
  const options = {
    easing: 'linear',
    elasticity: 100,
    round: false,
    foo: 'bar',
  };

  let now, anim, playback, onTick, entity;

  beforeEach(function() {
    onTick = sinon.stub();
    entity = sinon.spy();

    anim = new Animation([1, 2], 100, options)
      .tween([2, 4], 100);

    playback = new Playback(anim, entity)
      .onTick(onTick)
      .start();

    now = playback.startedAt;
  });

  describe('tick', function() {
    it('does nothing if the playback is not started', function() {
      playback.stop();
      playback.tick(now);
      expect(onTick).not.to.have.been.called;
    });

    it('interpolates between tweens', function() {
      playback.tick(playback.startedAt);
      expect(playback.currentValue).to.eql([1, 2]);

      playback.tick(now + 10);
      expect(playback.currentValue[0]).to.be.closeTo(1 + 1 * 10.0 / 100.0, 0.0001);
      expect(playback.currentValue[1]).to.be.closeTo(2 + 2 * 10.0 / 100.0, 0.0001);
    });

    it('calls onTickCallback with the current value and time', function() {
      playback.tick(now);
      onTick.reset();
      playback.tick(now + 10);
      expect(onTick).to.have.been.calledWith(playback.currentValue, now + 10);
    });
  });

  describe('when the current tween completes', function() {
    it('stops the playback when it completes the final tween and loop is false', function() {
      const onComplete = sinon.stub();
      const nonLoopingOptions = Object.assign({}, options, {loop: false});

      anim = new Animation([1, 2], 100, nonLoopingOptions)
        .tween([2, 4], 100);

      playback = new Playback(anim, entity)
        .onComplete(onComplete)
        .start();

      playback.tick(playback.startedAt + 200);

      // The naimation should have stopped on its own
      expect(onComplete).to.have.been.called;
      expect(playback.state.toString()).to.eql('Symbol(IDLE)');
    });
  });

  describe('rounding', function() {
    // this.options.round
  });

  describe('destroy', function() {
  });
});

describe('Playback: Stopping', function() {
  describe('gracefulStop', function() {
    let onComplete, entity, anim, playback, startedAt;

    beforeEach(function() {
      const options = {
        easing: 'linear',
        elasticity: 100,
        gracefulStop: true,
      };

      onComplete = sinon.stub();
      entity = sinon.spy();

      anim = new Animation([1, 2], 100, options)
        .tween([2, 4], 100);

      playback = new Playback(anim, entity)
        .onComplete(onComplete)
        .start();

      startedAt = playback.startedAt;
      playback.tick(startedAt + 300);     // tick to second tween...
      playback.stop();                    // playback should be stopping rather than idle
    });

    it('sets the state to stopping unless the playback is at 0 time', function() {
      // We are stopping, but the onComplete callback should not have been
      // triggered as we need need to reach the first tick again.
      expect(playback.state.toString()).to.eql('Symbol(STOPPING)');
      expect(onComplete).to.not.have.been.called;
    });

    it('stops the playback the next time it loops', function() {
      // move the animation back to the first tween again, which should trigger
      // our playback to stop.
      playback.tick(startedAt + 400);

      // Verify that we're actually in the stopped state
      expect(playback.state.toString()).to.eql('Symbol(IDLE)');
      expect(onComplete).to.have.been.called;
      expect(playback.currentValue).to.eql([]);
      expect(playback.currentDuration).to.eql(0.0);
    });
  });

  describe('stop', function() {
    let onComplete, entity, anim, playback, startedAt;

    beforeEach(function() {
      const options = {
        easing: 'linear',
        elasticity: 100,
        gracefulStop: false,
      };

      onComplete = sinon.stub();
      entity = sinon.spy();

      anim = new Animation([1, 2], 100, options)
        .tween([2, 4], 100);

      playback = new Playback(anim, entity)
        .onComplete(onComplete)
        .start();

      startedAt = playback.startedAt;
      playback.tick(startedAt + 50);     // halfway through the first tween
      playback.stop();
    });

    it('calls the onComplete callback', function() {
      expect(onComplete).to.have.been.called;
    });

    it('resets currentValue to undefined', function() {
      expect(playback.currentValue).to.eql([]);
      expect(playback.currentDuration).to.eql(0.0);
    });

    it('resets currentDuration to 0.0', function() {
      expect(playback.currentDuration).to.eql(0.0);
    });
  });
});
