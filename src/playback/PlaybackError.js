import SpiritedError from '../SpiritedError.js';

export default class PlaybackError extends SpiritedError {
  constructor(message) {
    super(message);
  }
}
