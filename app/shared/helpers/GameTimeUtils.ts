import last from 'lodash/last';

import { DEFAULT_RATING } from 'shared/constants';

import {
  ClockGame,
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

  changePlayerTime() {
    if (!this.needToChangeTime()) {
      return;
    }

    const prevTurn = this.getOpponentColor();
    const player = this.players[prevTurn];
    const lastMove = last(this.getUsedMoves());

    if (player.time === null || !lastMove) {
      return;
    }

    const {
      duration,
      prevPiecesWorth,
    } = lastMove;

    player.time -= duration;

    if (this.timeControl.type === TimeControlEnum.TIMER) {
      if (this.isCompensationChess) {
        const newPiecesWorth = this.getPiecesWorth();
        const gainedMaterial = newPiecesWorth[player.color] - prevPiecesWorth[player.color];
        const takenMaterial = prevPiecesWorth[this.turn] - newPiecesWorth[this.turn];

        player.time -= (gainedMaterial + takenMaterial) * this.pawnTimeValue;
      }

      if (!this.isFinished()) {
        player.time += this.timeControl.increment;
      }

      if (player.time < 0) {
        player.time = 0;
      }
    } else if (!this.isFinished()) {
      player.time = this.timeControl.base;
    }
  }

  needToChangeTime(): this is ClockGame {
    return !!this.timeControl && this.getUsedMoves().length > 2;
  }

  setupStartingData() {
    super.setupStartingData();

    if (this.timeControl) {
      this.players[ColorEnum.WHITE].time = this.timeControl.base;
      this.players[ColorEnum.BLACK].time = this.timeControl.base;
    }
  }
}
