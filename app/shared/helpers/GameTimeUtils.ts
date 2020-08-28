import last from 'lodash/last';

import { DEFAULT_RATING } from 'shared/constants';

import {
  ColorEnum,
  GameCreateOptions,
  GamePlayers,
  TimeControl,
  TimeControlEnum,
} from 'shared/types';

import GameResultUtils from './GameResultUtils';

export default class GameTimeUtils extends GameResultUtils {
  players: GamePlayers = {
    [ColorEnum.WHITE]: {
      id: 'white',
      name: 'White',
      color: ColorEnum.WHITE,
      rating: DEFAULT_RATING.r,
      newRating: null,
      time: null,
    },
    [ColorEnum.BLACK]: {
      id: 'black',
      name: 'Black',
      color: ColorEnum.BLACK,
      rating: DEFAULT_RATING.r,
      newRating: null,
      time: null,
    },
  };
  timeControl: TimeControl;
  lastMoveTimestamp: number = 0;
  pawnTimeValue: number = 0;

  constructor(options: GameCreateOptions) {
    super(options);

    this.timeControl = options.timeControl;

    this.setupStartingData();

    if (this.isCompensationChess && this.timeControl?.type === TimeControlEnum.TIMER) {
      this.pawnTimeValue = this.timeControl.base / 2 / this.getPiecesWorth()[ColorEnum.WHITE];
    }
  }

  changePlayerTime(averagePing: number = 0) {
    if (this.needToChangeTime() && this.timeControl) {
      const prevTurn = this.getOpponentColor();
      const player = this.players[prevTurn];
      const {
        duration: actualDuration,
        prevPiecesWorth,
      } = last(this.getUsedMoves())!;
      const duration = Math.max(actualDuration / 2, actualDuration - averagePing / 2);

      if (this.isFinished()) {
        player.time! -= duration;
      } else if (this.timeControl.type === TimeControlEnum.TIMER) {
        player.time! -= duration - this.timeControl.increment;

        if (this.isCompensationChess) {
          const newPiecesWorth = this.getPiecesWorth();
          const gainedMaterial = newPiecesWorth[player.color] - prevPiecesWorth[player.color];
          const takenMaterial = prevPiecesWorth[this.turn] - newPiecesWorth[this.turn];

          player.time! -= (gainedMaterial + takenMaterial) * this.pawnTimeValue;
        }
      } else {
        player.time = this.timeControl.base;
      }

      player.time = Math.max(player.time!, 0);
    }
  }

  needToChangeTime(): boolean {
    return this.getUsedMoves().length > 2;
  }

  setupStartingData() {
    super.setupStartingData();

    if (this.timeControl) {
      this.players[ColorEnum.WHITE].time = this.timeControl.base;
      this.players[ColorEnum.BLACK].time = this.timeControl.base;
    }
  }
}
