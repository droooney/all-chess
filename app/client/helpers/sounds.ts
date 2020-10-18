import { Howl } from 'howler';

import mp3MoveSound from 'client/sounds/piece-move2/index.mp3';
import mp3CaptureSound from 'client/sounds/piece-capture4/index.mp3';
import oggMoveSound from 'client/sounds/piece-move2/index.ogg';
import oggCaptureSound from 'client/sounds/piece-capture4/index.ogg';

type SoundType = 'pieceMove' | 'pieceCapture';

const sounds: Record<SoundType, [string, ...string[]]> = {
  pieceMove: [mp3MoveSound, oggMoveSound],
  pieceCapture: [mp3CaptureSound, oggCaptureSound],
};

export class Sound {
  sound: Howl;
  loadPromise: Promise<void>;

  constructor(type: SoundType) {
    let res = () => {};

    this.loadPromise = new Promise((resolve) => res = resolve);

    this.sound = new Howl({
      src: sounds[type],
      preload: true,
      onload: res,
    });
  }

  async load() {
    await this.loadPromise;
  }

  play() {
    this.sound.stop();
    this.sound.play();
  }
}
