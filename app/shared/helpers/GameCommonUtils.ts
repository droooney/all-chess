import * as _ from 'lodash';

import { GameVariantEnum } from '../types';

export default class GameCommonUtils {
  static generateUid(map: Record<string, any>): string {
    let id: string;

    do {
      id = _.times(10, () => String.fromCharCode(97 + Math.floor(Math.random() * 26))).join('');
    } while (map[id]);

    return id;
  }

  static getIsPocketUsed(variants: readonly GameVariantEnum[]): boolean {
    return variants.includes(GameVariantEnum.CRAZYHOUSE);
  }
}
