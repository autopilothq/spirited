import createTween from '../../src/animation/createTween.js';

export const createMockAnim = (tweenValues, duration = 200) => {
  let tweens = [];

  for (const values of tweenValues) {
    const startAt = tweens.length > 0 ? tweens[tweens.length - 1].end : 0;
    tweens.push(createTween(startAt, duration, values));
  }

  return {
    tweens,

    get lastTween() {
      return tweens[tweens.length - 1];
    },

    get totalDuration() {
      return this.lastTween && this.lastTween.end;
    },

    get cardinality() {
      return tweens[0] ? tweens[0].values.length : -1;
    },

    atTime() {
      if (tweenValues.length === 0) {
        return void 0;
      }

      return tweenValues[0].map(values => values[0]);
    },
  };
};
