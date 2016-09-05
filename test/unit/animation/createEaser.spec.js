import sinon from 'sinon';
import * as easingFunctions from 'easing-utils';
import createEaser from '../../../src/animation/createEaser.js';

describe('createEaser', () => {
  it('throws an exception if easing name is not valid', function() {
    const easing = 'foo';
    expect(() => {
      createEaser(easing, 10);
    }).throw(`${easing} is not a valid easing method`);
  });

  it('returns a function that calls the easing function', function() {
    sinon.spy(easingFunctions, 'linear');
    const easer = createEaser('linear', 10);
    expect(easer(0.5)).to.eql(0.5);
    easingFunctions.linear.should.have.been.calledWith(0.5);
  });
});
