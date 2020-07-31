import times from 'lodash/times';

import { Dictionary, GameVariantEnum } from 'shared/types';

export default class GameCommonUtils {
  static generateUid(map: Dictionary<any>): string {
    let id: string;

    do {
      id = times(10, () => String.fromCharCode(97 + Math.floor(Math.random() * 26))).join('');
    } while (map[id]);

    return id;
  }

  static getIsPocketUsed(variants: readonly GameVariantEnum[]): boolean {
    return variants.includes(GameVariantEnum.CRAZYHOUSE);
  }
}
