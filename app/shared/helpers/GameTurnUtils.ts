import { ColorEnum, StartingData } from 'shared/types';

import GameVariantsUtils from './GameVariantsUtils';

export default abstract class GameTurnUtils extends GameVariantsUtils {
  static getOppositeColor(color: ColorEnum): ColorEnum {
    return color === ColorEnum.WHITE
      ? ColorEnum.BLACK
      : ColorEnum.WHITE;
  }

  abstract startingData: StartingData;

  turn: ColorEnum = ColorEnum.WHITE;

  getOpponentColor(): ColorEnum {
    return GameTurnUtils.getOppositeColor(this.turn);
  }

  setupStartingData() {
    this.turn = this.startingData.turn;
  }
}
