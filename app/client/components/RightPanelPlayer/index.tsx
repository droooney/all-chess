import * as _ from 'lodash';
import moment = require('moment');
import * as React from 'react';
import classNames = require('classnames');

import {
  ColorEnum,
  Piece as IPiece,
  PieceEnum,
  PieceLocationEnum,
  PiecePocketLocation,
  Player,
  PocketPiece,
  PocketPieces,
  TimeControl
} from '../../../types';

import Piece from '../Piece';

interface OwnProps {
  currentPlayer: Player | null;
  player: Player;
  pocket: PocketPieces | null;
  timePassedSinceLastMove: number;
  timeControl: TimeControl;
  realTurn: ColorEnum;
  isTop: boolean;
  selectedPiece: PocketPiece | null;
  selectPiece(piece: IPiece | null): void;
}

type Props = OwnProps;

const ONE_HOUR = 60 * 60 * 1000;
const ONE_DAY = 24 * ONE_HOUR;
const POCKET_PIECES_ORDER: { [piece in PieceEnum]: number; } = {
  [PieceEnum.KING]: 1,
  [PieceEnum.QUEEN]: 2,
  [PieceEnum.ROOK]: 3,
  [PieceEnum.BISHOP]: 4,
  [PieceEnum.KNIGHT]: 5,
  [PieceEnum.PAWN]: 6
};

export default class RightPanelPlayer extends React.Component<Props> {
  getTimeString(time: number): string {
    time = Math.max(time, 0);

    if (time > ONE_DAY) {
      const days = Math.floor(moment.duration(time).asDays());

      return `${days} ${moment(time).format('HH:mm:ss')}`;
    }

    if (time > ONE_HOUR) {
      return moment(time).format('HH:mm:ss');
    }

    return moment(time).format('mm:ss');
  }

  onPocketPieceClick(location: PiecePocketLocation) {
    const {
      currentPlayer,
      player,
      realTurn,
      pocket,
      selectPiece,
      selectedPiece
    } = this.props;

    if (
      !currentPlayer
      || currentPlayer.color !== player.color
      || player.color !== realTurn
    ) {
      return;
    }

    if (
      selectedPiece
      && selectedPiece.location.pieceType === location.pieceType
    ) {
      selectPiece(null);
    } else {
      selectPiece(pocket![location.pieceType][0]);
    }
  }

  render() {
    const {
      player,
      currentPlayer,
      timePassedSinceLastMove,
      realTurn,
      pocket,
      selectedPiece,
      timeControl,
      isTop
    } = this.props;

    return (
      <div className={`player ${isTop ? 'top' : 'bottom'}`}>

        {pocket && (
          <div className="pocket">
            {
              _(pocket)
                .entries()
                .sortBy(([type]) => POCKET_PIECES_ORDER[type as PieceEnum])
                .map(([type, pieces]: [PieceEnum, PocketPiece[]]) => (
                  <div
                    key={type}
                    className={classNames('piece-container', {
                      disabled: !pieces.length
                    })}
                    onClick={pieces.length ? (() => this.onPocketPieceClick(pieces[0].location)) : undefined}
                  >
                    {
                      selectedPiece
                      && currentPlayer
                      && selectedPiece.location.pieceType === type
                      && player.color === currentPlayer.color
                      && (
                        <div className="selected-square" />
                      )
                    }

                    <Piece
                      key={type}
                      piece={pieces.length ? pieces[0] : {
                        color: player.color,
                        type,
                        location: {
                          type: PieceLocationEnum.POCKET,
                          pieceType: type
                        }
                      }}
                    />

                    {!!pieces.length && (
                      <span className="count">
                        {pieces.length}
                      </span>
                    )}
                  </div>
                ))
                .value()
            }
          </div>
        )}

        {timeControl && (
          <div className="timer">
            {this.getTimeString(
              player.color === realTurn
                ? player.time! - timePassedSinceLastMove
                : player.time!
            )}
          </div>
        )}

        <div>
          {player.login}
        </div>

      </div>
    );
  }
}
