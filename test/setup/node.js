import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinon from 'sinon';
import Promise from 'bluebird';

chai.should();
chai.use(chaiAsPromised);

global.chai = chai;
global.sinon = sinon;

global.chaiAsPromised = chaiAsPromised;
global.expect = chai.expect;
global.AssertionError = chai.AssertionError;
global.Assertion = chai.Assertion;
global.assert = chai.assert;

global.fulfilledPromise = Promise.resolve;
global.rejectedPromise = Promise.reject;
global.defer = Promise.defer;
global.waitAll = Promise.all;
