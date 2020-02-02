import GameVariantsUtils from './GameVariantsUtils';
import { ColorEnum, StartingData } from '../../types';

export default abstract class GameTurnUtils extends GameVariantsUtils {
  static getOppositeColor(color: ColorEnum): ColorEnum {
    return color === ColorEnum.WHITE
      ? ColorEnum.BLACK
      : ColorEnum.WHITE;
  }

  abstract pliesCount: number;
  abstract pliesPerMove: number;
  abstract startingData: StartingData;

  turn: ColorEnum = ColorEnum.WHITE;

  getNextTurn(): ColorEnum {
    return this.pliesCount % this.pliesPerMove === this.pliesPerMove - 2
      ? ColorEnum.BLACK
      : ColorEnum.WHITE;
  }

  getOpponentColor(): ColorEnum {
    return GameTurnUtils.getOppositeColor(this.turn);
  }

  getPrevTurn(): ColorEnum {
    return this.pliesCount % this.pliesPerMove === 0
      ? ColorEnum.BLACK
      : ColorEnum.WHITE;
  }

  setupStartingData() {
    this.turn = this.startingData.turn;
  }
}
