import present from 'present';
import sinon from 'sinon';
import Animation from '../../src/Animation.js';


describe('Animation: initial state', function() {
  let anim;

  beforeEach(function() {
    anim = new Animation([1, 2], 100, {
      easing: 'easeInOutElastic',
      elasticity: 100,
      round: false,
      loop: true,
      foo: 'bar',
    });
  });

  it('sets the defaultDuration property', function() {
    expect(anim.defaultDuration).to.eql(100);
  });

  it('makes defaultDuration readonly', function() {
    const prop = Object.getOwnPropertyDescriptor(anim, 'defaultDuration');
    expect(prop.set).to.be.undefined;
    expect(prop.get).to.not.be.undefined;
  });

  it('defaults currentIndex to 0', function() {
    expect(anim.currentIndex).to.eql(0);
  });

  it('defaults the state to idle', function() {
    expect(anim.state.toString()).to.eql('Symbol(IDLE)');
  });

  it('includes the defaults in the options', function() {
    expect(anim.options.foo).to.eql('bar');
  });

  it('makes options constant', function() {
    expect(Object.isFrozen(anim.options)).to.be.true;
  });

  describe('current tween', function() {
    it('returns the initial tween for #current', function() {
      expect(anim.current).to.eql({
        start: 0,
        end: 100,
        duration: 100,
        values: [
          [1, void 0],
          [2, void 0],
        ],
      });
    });
  });
});

describe('Animation: Running state', () => {
  const options = {
    easing: 'linear',
    elasticity: 100,
    round: false,
    foo: 'bar',
  };

  let now, anim, onTick, startedAt;

  beforeEach(function() {
    onTick = sinon.stub();
    anim = new Animation([1, 2], 100, options)
      .tween([2, 4], 100)
      .onTick(onTick)
      .start();
    startedAt = anim.startedAt;
    now = present();
  });

  function startAndStopAnim(animOptions = options) {
    anim = new Animation([1, 2], 100, animOptions)
      .tween([2, 4], 100)
      .start();

    // move forward in time so we aren't at 0 when we stop
    anim.tick(anim.startedAt + 10);
    anim.stop();

    // We're stopping at time +10 with gracefulStop on
    expect(anim.state.toString()).to.eql('Symbol(STOPPING)');

    startedAt = anim.startedAt;
    now = present();
    return anim;
  }

  describe('timeToDuration', function() {
    it('throws an exception if time is before startedAt', function() {
      expect(() => {
        anim.timeToDuration(startedAt - 100);
      }).to.throw('Cannot find a tween before the animation starts');
    });

    it('returns the correct tween when the time is the start time', function() {
      expect(anim.timeToDuration(startedAt)).to.eql(0);
    });

    it('returns the correct tween when the time is within the animations duration', function() {
      expect(anim.timeToDuration(startedAt + 100)).to.eql(100);
    });

    it('returns the correct tween when the animation is looped', function() {
      expect(anim.timeToDuration(startedAt + 200)).to.eql(0);
      expect(anim.timeToDuration(startedAt + 201)).to.eql(1);
      expect(anim.timeToDuration(startedAt + 300)).to.eql(100);
      expect(anim.timeToDuration(startedAt + 400)).to.eql(0);
    });

    it('returns undefined when the time is after a non-looping animation\'s duration', function() {
      const nonLoopingOptions = Object.assign({}, options, {loop: false});

      anim = startAndStopAnim(nonLoopingOptions);
      expect(anim.timeToDuration(startedAt)).to.eql(0);
      expect(anim.timeToDuration(startedAt + 100)).to.eql(100);
      expect(anim.timeToDuration(startedAt + 200)).to.be.undefined;
      expect(anim.timeToDuration(startedAt + 201)).to.be.undefined;
    });
  });

  describe('tweenAtTime', function() {
    const firstTween = {
      start: 0,
      end: 100,
      duration: 100,
      values: [
        [1, 1],
        [2, 2],
      ],
    };

    const secondTween = {
      start: 100,
      end: 200,
      duration: 100,
      values: [
        [2, -1],
        [4, -2],
      ],
    };

    it('matches the first tween', function() {
      expect(anim.tweenAtTime(startedAt)).to.eql([firstTween, 0, 0]);
    });

    it('returns tweens when the time is within the animation duration without looping', function() {
      expect(anim.tweenAtTime(startedAt + 90)).to.eql([firstTween, 0, 90]);
      expect(anim.tweenAtTime(startedAt + 100)).to.eql([secondTween, 1, 100]);
      expect(anim.tweenAtTime(startedAt + 101)).to.eql([secondTween, 1, 101]);
    });

    it('returns tweens when the time is outside the animation duration with looping', function() {
      expect(anim.tweenAtTime(startedAt + 200)).to.eql([firstTween, 0, 0]);
      expect(anim.tweenAtTime(startedAt + 201)).to.eql([firstTween, 0, 1]);
      expect(anim.tweenAtTime(startedAt + 300)).to.eql([secondTween, 1, 100]);
      expect(anim.tweenAtTime(startedAt + 400)).to.eql([firstTween, 0, 0]);
    });
  });

  describe('tick', function() {
    it('does nothing if the animation is not started', function() {
      anim.stop();
      anim.tick(now);
      expect(onTick).not.to.have.been.called;
    });

    it('interpolates timeInTween', function() {
      anim.tick(anim.startedAt);
      expect(anim.currentValue).to.eql([1, 2]);

      anim.tick(now + 10);
      expect(anim.currentValue[0]).to.be.closeTo(1 + 1 * 10.0 / 100.0, 0.0001);
      expect(anim.currentValue[1]).to.be.closeTo(2 + 2 * 10.0 / 100.0, 0.0001);
    });

    it('calls onTickCallback with timeInTween', function() {
      anim.tick(now);
      onTick.reset();
      anim.tick(now + 10);
      expect(onTick).to.have.been.calledWith(anim.currentValue, now + 10);
    });
  });

  describe('when the current tween completes', function() {
    it('increments currentIndex', function() {
      expect(anim.currentIndex).to.eql(0);
      anim.tick(now);           // trigger tween[0] (start tween)
      expect(anim.currentIndex).to.eql(0);
      anim.tick(now + 100);     // trigger tween[1]
      expect(anim.currentIndex).to.eql(1);
      anim.tick(now + 200);     // complete the animation and return to start tween
      expect(anim.currentIndex).to.eql(0);
    });

    it('stops the animation when it completes the final tween and loop is false', function() {
      const onComplete = sinon.stub();
      const nonLoopingOptions = Object.assign({}, options, {loop: false});
      anim = new Animation([1, 2], 100, nonLoopingOptions)
        .tween([2, 4], 100)
        .onComplete(onComplete)
        .start();
      anim.tick(anim.startedAt + 200);

      // The naimation should have stopped on its own
      expect(onComplete).to.have.been.called;
      expect(anim.state.toString()).to.eql('Symbol(IDLE)');
    });
  });

  describe('rounding', function() {
    // this.options.round
  });

  describe('destroy', function() {
  });
});

describe('Animation: Stopping', function() {
  describe('gracefulStop', function() {
    let onComplete, anim, startedAt;

    beforeEach(function() {
      const options = {
        easing: 'linear',
        elasticity: 100,
        gracefulStop: true,
      };

      onComplete = sinon.stub();
      anim = new Animation([1, 2], 100, options)
        .tween([2, 4], 100)
        .onComplete(onComplete)
        .start();
      startedAt = anim.startedAt;
      anim.tick(startedAt + 200);     // tick back to the first tween
    });

    it('stops the animation when loop is true but state is stopping', function() {
      anim.tick(startedAt + 300);     // tick to second tween...
      anim.stop();

      // We are stopping, but the onComplete callback should not have been
      // triggered as we need need to reach the first tick again.
      expect(anim.state.toString()).to.eql('Symbol(STOPPING)');
      expect(onComplete).to.not.have.been.called;

      // ...and back to first tween again so our callback should trigger.
      anim.tick(startedAt + 400);
      expect(onComplete).to.have.been.called;
      expect(anim.state.toString()).to.eql('Symbol(IDLE)');
    });

    it('calls the onComplete callback', function() {
      anim.stop();
      expect(onComplete).to.have.been.called;
    });

    it('resets currentIndex to the initial frame', function() {
      anim.stop();
      expect(anim.currentIndex).to.eql(0);
    });
  });

  describe('stop', function() {
    let onComplete, anim, startedAt;

    beforeEach(function() {
      const options = {
        easing: 'linear',
        elasticity: 100,
        gracefulStop: false,
      };

      onComplete = sinon.stub();
      anim = new Animation([1, 2], 100, options)
        .tween([2, 4], 100)
        .onComplete(onComplete)
        .start();
      startedAt = anim.startedAt;
      anim.tick(startedAt + 50);     // halfway through the first tween
      anim.stop();
    });

    it('calls the onComplete callback', function() {
      expect(onComplete).to.have.been.called;
    });

    it('resets currentIndex to the initial frame', function() {
      expect(anim.currentIndex).to.eql(0);
    });
  });
});
