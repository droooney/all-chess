import { Howl } from 'howler';

import { isNotUndefined } from 'client/helpers/common';

import { Dictionary } from 'shared/types';

// @ts-ignore
import mp3Sounds from 'client/sounds/*/*.mp3';
// @ts-ignore
import oggSounds from 'client/sounds/*/*.ogg';

type SoundType = 'piece-move' | 'piece-move2' | 'piece-move3' | 'piece-capture' | 'piece-capture2' | 'piece-capture3' | 'piece-capture4';

type Sounds = Partial<Dictionary<{ index: string; }>>;

const volumes: Partial<Record<SoundType, number>> = {
  'piece-capture': 0.3
};

export class Sound {
  sound: Howl;
  loadPromise: Promise<void>;

  constructor(type: SoundType) {
    let res = () => {};

    this.loadPromise = new Promise((resolve) => res = resolve);

    this.sound = new Howl({
      src: ([mp3Sounds, oggSounds] as Sounds[]).map((sounds) => sounds[type]?.index).filter(isNotUndefined),
      preload: true,
      volume: volumes[type] || 1,
      onload: res
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
