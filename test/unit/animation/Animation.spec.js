import sinon from 'sinon';
import Animation from '../../../src/animation/Animation.js';

describe('Animation', function() {
  const options = {
    easing: 'linear',
    elasticity: 100,
    round: false,
    foo: 'bar',
  };

  const firstTween = {
    start: 0,
    end: 100,
    duration: 100,
    values: [
      [1, 1],
      [2, 2],
    ],
  };

  let anim;

  beforeEach(function() {
    anim = new Animation([1, 2], 100, options)
      .tween([2, 4], 100);
  });

  it('sets the defaultDuration property', function() {
    expect(anim.defaultDuration).to.eql(100);
  });

  it('makes defaultDuration readonly', function() {
    const prop = Object.getOwnPropertyDescriptor(anim, 'defaultDuration');
    expect(prop.set).to.be.undefined;
    expect(prop.value).to.not.be.undefined;
  });

  it('makes options constant', function() {
    expect(Object.isFrozen(anim.options)).to.be.true;
  });

  it('has a getter for the last tween', function() {
    expect(anim.lastTween).to.eql(anim.tweens[1]);
  });

  it('has a getter for the endTime', function() {
    expect(anim.endTime).to.eql(anim.lastTween.end);
  });

  describe('elapsedToDuration', function() {
    it('throws an exception if time is before startedAt', function() {
      expect(() => {
        anim.elapsedToDuration(-100);
      }).to.throw('Cannot find a tween before the animation starts');
    });

    it('returns the correct tween when the time is the start time', function() {
      expect(anim.elapsedToDuration(0)).to.eql(0);
    });

    it('returns the correct tween when the time is within the animations duration', function() {
      expect(anim.elapsedToDuration(100)).to.eql(100);
    });

    it('returns the correct tween when the animation is looped', function() {
      expect(anim.elapsedToDuration(200)).to.eql(0);
      expect(anim.elapsedToDuration(201)).to.eql(1);
      expect(anim.elapsedToDuration(300)).to.eql(100);
      expect(anim.elapsedToDuration(400)).to.eql(0);
    });

    it('returns undefined when the time is after a non-looping animation\'s duration', function() {
      const nonLoopingOptions = Object.assign({}, options, {loop: false});
      anim = new Animation([1, 2], 100, nonLoopingOptions)
        .tween([2, 4], 100);

      expect(anim.elapsedToDuration()).to.eql(0);
      expect(anim.elapsedToDuration(100)).to.eql(100);
      expect(anim.elapsedToDuration(200)).to.be.undefined;
      expect(anim.elapsedToDuration(201)).to.be.undefined;
    });
  });

  describe('tweenAtTime', function() {
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
      expect(anim.tweenAtTime()).to.eql([firstTween, 0]);
    });

    it('returns tweens when the time is within the animation duration without looping', function() {
      expect(anim.tweenAtTime(90)).to.eql([firstTween, 90]);
      expect(anim.tweenAtTime(100)).to.eql([secondTween, 100]);
      expect(anim.tweenAtTime(101)).to.eql([secondTween, 101]);
    });

    it('returns tweens when the time is outside the animation duration with looping', function() {
      expect(anim.tweenAtTime(200)).to.eql([firstTween, 0]);
      expect(anim.tweenAtTime(201)).to.eql([firstTween, 1]);
      expect(anim.tweenAtTime(300)).to.eql([secondTween, 100]);
      expect(anim.tweenAtTime(400)).to.eql([firstTween, 0]);
    });
  });

  describe('interpolate', function() {
    let ease, values;

    beforeEach(function() {
      ease = sinon.spy(anim, 'ease');
      values = anim.interpolate(firstTween, 50);
    });

    afterEach(function() {
      ease.reset();
    });

    it('calls the easing function with the correct time', function() {
      expect(ease).to.have.been.calledWith(0.5);
    });

    it('only calls the easing function once', function() {
      expect(ease.calledOnce).to.be.true;
    });

    it('correctly interpolates values', function() {
      expect(values).to.eql([1.5, 3]);
    });

    it('rounds the interpolated values when rounding is enabled', function() {
      const nonLoopingOptions = Object.assign({}, options, {round: true});
      const nonLoopingAnim = new Animation([1, 2], 100, nonLoopingOptions)
        .tween([2, 4], 100);

      expect(nonLoopingAnim.interpolate(firstTween, 50)).to.eql([2, 3]);
    });
  });

  describe('atTime', function() {
    let interpolate, tweenAtTime;

    beforeEach(function() {
      interpolate = sinon.spy(anim, 'interpolate');
      tweenAtTime = sinon.stub(anim, 'tweenAtTime', () => [firstTween, 50]);
      anim.atTime(50);
    });

    afterEach(function() {
      interpolate.reset();
      tweenAtTime.restore();
    });

    it('calls the tweenAtTime with the correct elapsed time', function() {
      expect(tweenAtTime).to.have.been.calledWith(50);
    });

    it('passes the right tween and duration to interpolate', function() {
      expect(interpolate).to.have.been.calledWith(firstTween, 50);
    });
  });

  describe('playback', function() {
    // this.options.round
  });
});
