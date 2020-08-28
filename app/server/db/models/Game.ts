import { DataTypes, Model } from 'sequelize';

import {
  ChatMessage,
  ColorEnum,
  EachColor, GameResult,
  GameStatusEnum,
  GameVariantEnum,
  PGNTags,
  TakebackRequest,
  TimeControl,
} from 'shared/types';

import sequelize from 'server/db';
import { User } from 'server/db/models';

interface DBGamePlayer {
  id: number;
  color: ColorEnum;
  rating: number;
  newRating: number | null;
  time: number | null;
}

export interface GameAddAttributes {
  id: string;
  status: GameStatusEnum;
  result: GameResult | null;
  whitePlayer: DBGamePlayer;
  blackPlayer: DBGamePlayer;
  timeControl: TimeControl;
  variants: GameVariantEnum[];
  rated: boolean;
  fen: string | null;
  chat: ChatMessage[];
  takebackRequest: TakebackRequest | null;
  drawOffer: ColorEnum | null;
  pgnTags: PGNTags;
  lastMoveTimestamp: Date;
  moves: { uci: string; t: number; }[];
}

export interface GameAttributes extends GameAddAttributes {
  createdAt: Date;
  updatedAt: Date;
}

export interface Game extends GameAttributes {}

export class Game extends Model<GameAttributes, GameAddAttributes> {
  playerNames?: EachColor<string>;

  async getPlayers() {
    const [whitePlayer, blackPlayer] = await Promise.all([
      User.findByPk(this.whitePlayer.id),
      User.findByPk(this.blackPlayer.id),
    ]);

    if (whitePlayer && blackPlayer) {
      this.playerNames = {
        [ColorEnum.WHITE]: whitePlayer.login,
        [ColorEnum.BLACK]: blackPlayer.login,
      };
    }
  }
}

Game.init({
  id: {
    type: DataTypes.STRING,
    allowNull: false,
    primaryKey: true,
  },
  status: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isIn: [Object.values(GameStatusEnum)],
    },
  },
  result: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
  whitePlayer: {
    type: DataTypes.JSONB,
    allowNull: false,
  },
  blackPlayer: {
    type: DataTypes.JSONB,
    allowNull: false,
  },
  timeControl: {
    type: DataTypes.JSONB,
    field: 'time_control',
    allowNull: true,
  },
  variants: {
    type: DataTypes.JSONB,
    allowNull: false,
  },
  rated: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
  },
  fen: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  chat: {
    type: DataTypes.JSON,
    allowNull: false,
  },
  takebackRequest: {
    type: DataTypes.STRING,
    field: 'takeback_request',
    allowNull: true,
  },
  drawOffer: {
    type: DataTypes.STRING,
    field: 'draw_offer',
    allowNull: true,
  },
  pgnTags: {
    type: DataTypes.JSON,
    allowNull: false,
  },
  lastMoveTimestamp: {
    type: DataTypes.DATE,
    field: 'last_move_timestamp',
    allowNull: false,
  },
  moves: {
    type: DataTypes.JSON,
    allowNull: false,
  },
  createdAt: {
    type: DataTypes.DATE,
    field: 'created_at',
    allowNull: false,
  },
  updatedAt: {
    type: DataTypes.DATE,
    field: 'updated_at',
    allowNull: false,
  },
}, {
  sequelize,
  tableName: 'games',
});
