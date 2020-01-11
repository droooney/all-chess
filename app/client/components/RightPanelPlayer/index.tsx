import * as _ from 'lodash';
import moment = require('moment');
import * as React from 'react';

import {
  ColorEnum,
  Piece as IPiece,
  PieceLocationEnum,
  PiecePocketLocation,
  PieceTypeEnum,
  Player,
  PocketPiece,
  RealPieceLocation,
  TimeControl
} from '../../../types';
import { Game } from '../../helpers';

import Piece from '../Piece';
import PlayerPocket from '../PlayerPocket';

interface OwnProps {
  game: Game;
  player: Player;
  pocket: PocketPiece[];
  timePassedSinceLastMove: number;
  timeControl: TimeControl;
  enableClick: boolean;
  enableDnd: boolean;
  realTurn: ColorEnum;
  isTop: boolean;
  allMaterialDifference: number;
  materialDifference: {
    [piece in PieceTypeEnum]: number;
  };
  selectedPiece: PocketPiece | null;
  selectPiece(piece: IPiece | null): void;
  startDraggingPiece(e: React.MouseEvent, location: RealPieceLocation): void;
}

type Props = OwnProps;

const ONE_HOUR = 60 * 60 * 1000;
const ONE_DAY = 24 * ONE_HOUR;

export default class RightPanelPlayer extends React.Component<Props> {
  getTimeString(): string {
    const {
      player,
      timePassedSinceLastMove,
      realTurn
    } = this.props;
    const time = Math.max(
      player.color === realTurn
        ? player.time! - timePassedSinceLastMove
        : player.time!,
      0
    );
    const duration = moment.duration(time);

    if (time >= ONE_DAY) {
      const days = duration.days();
      const hours = duration.hours();

      return `${days} ${days === 1 ? 'day' : 'days'}${hours ? ` ${hours} ${hours === 1 ? 'hour' : 'hours'}` : ''}`;
    }

    const minutes = _.padStart(`${duration.minutes()}`, 2, '0');
    const seconds = _.padStart(`${duration.seconds()}`, 2, '0');

    if (time > ONE_HOUR) {
      const hours = _.padStart(`${duration.hours()}`, 2, '0');

      return `${hours}:${minutes}:${seconds}`;
    }

    return `${minutes}:${seconds}`;
  }

  onPocketPieceClick(location: PiecePocketLocation) {
    const {
      game,
      player,
      selectPiece,
      selectedPiece
    } = this.props;

    if (
      selectedPiece
      && selectedPiece.location.pieceType === location.pieceType
    ) {
      selectPiece(null);
    } else {
      selectPiece(game.getPocketPiece(location.pieceType, player.color));
    }
  }

  render() {
    const {
      game,
      player,
      pocket,
      enableClick,
      enableDnd,
      selectedPiece,
      timeControl,
      isTop,
      allMaterialDifference,
      materialDifference,
      selectPiece,
      startDraggingPiece
    } = this.props;
    const elements: JSX.Element[] = [];

    if (game.needToCalculateMaterialDifference) {
      elements.push(
        <div key="material-advantage" className="material-advantage">
          {_.map(materialDifference, (count, pieceType) => {
            if (game.isThreeCheck && pieceType === PieceTypeEnum.KING) {
              count = game.checksCount[player.color] * (player.color === ColorEnum.WHITE ? 1 : -1);
            }

            const isAdvantage = player.color === ColorEnum.WHITE ? count > 0 : count < 0;

            if (!isAdvantage) {
              return;
            }

            count = Math.abs(count);

            return (
              <div className="piece-advantage" key={pieceType}>
                <Piece
                  piece={{
                    color: player.color,
                    type: pieceType as PieceTypeEnum,
                    location: {
                      type: PieceLocationEnum.POCKET,
                      pieceType: pieceType as PieceTypeEnum,
                      color: player.color
                    }
                  }}
                />
                {count > 1 && (
                  <span className="count">
                    x{count}
                  </span>
                )}
              </div>
            );
          })}
          {(player.color === ColorEnum.WHITE ? allMaterialDifference > 0 : allMaterialDifference < 0) && (
            <span className="all-material-advantage">
              +{Math.abs(allMaterialDifference)}
            </span>
          )}
        </div>
      );
    }

    if (game.isPocketUsed) {
      elements.push(
        <PlayerPocket
          key="pocket"
          game={game}
          color={player.color}
          pocket={pocket}
          enableClick={enableClick}
          enableDnd={enableDnd}
          selectedPiece={selectedPiece}
          selectPiece={selectPiece}
          startDraggingPiece={startDraggingPiece}
        />
      );
    }

    if (timeControl) {
      elements.push(
        <div key="timer" className="timer">
          {this.getTimeString()}
        </div>
      );
    }

    elements.push(
      <div key="login">
        {player.login}
      </div>
    );

    if (!isTop) {
      elements.reverse();
    }

    return (
      <div className="player">
        {elements}
      </div>
    );
  }
}
