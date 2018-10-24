import moment = require('moment');
import * as React from 'react';
import classNames = require('classnames');

import {
  ColorEnum,
  Piece as IPiece,
  PieceLocationEnum,
  PiecePocketLocation,
  PieceTypeEnum,
  Player,
  PocketPiece,
  TimeControl
} from '../../../types';

import Piece from '../Piece';

interface OwnProps {
  currentPlayer: Player | null;
  player: Player;
  pocket: PocketPiece[];
  pocketPiecesUsed: PieceTypeEnum[];
  timePassedSinceLastMove: number;
  timeControl: TimeControl;
  realTurn: ColorEnum;
  isTop: boolean;
  isPocketUsed: boolean;
  selectedPiece: PocketPiece | null;
  selectPiece(piece: IPiece | null): void;
  getPocketPiece(type: PieceTypeEnum, color: ColorEnum): PocketPiece | null;
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
      getPocketPiece,
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
      selectPiece(getPocketPiece(location.pieceType, player.color));
    }
  }

  render() {
    const {
      player,
      currentPlayer,
      isPocketUsed,
      pocket,
      pocketPiecesUsed,
      selectedPiece,
      timeControl,
      isTop
    } = this.props;
    const elements: JSX.Element[] = [];

    if (isPocketUsed) {
      elements.push(
        <div key="pocket" className="pocket">
          {pocketPiecesUsed.map((type) => {
            const pieces = pocket.filter(({ type: pieceType }) => pieceType === type);

            return (
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
            );
          })}
        </div>
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
