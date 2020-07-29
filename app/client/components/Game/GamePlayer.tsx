import * as _ from 'lodash';
import moment from 'moment';
import * as React from 'react';
import classNames from 'classnames';

import { COLOR_NAMES } from 'shared/constants';
import { pocketPieces } from 'client/constants';

import {
  AnyMove,
  ColorEnum,
  EachPieceType,
  GameStatusEnum,
  Piece as IPiece,
  PieceTypeEnum,
  Player,
  PocketPiece,
  RealPieceLocation,
  TimeControl,
  TimeControlEnum,
} from 'shared/types';

import { Game } from 'client/helpers';

import Piece from '../Piece';
import PlayerPocket from '../PlayerPocket';

interface OwnProps {
  game: Game;
  player: Player;
  playingPlayer: Player | null;
  pieces: readonly IPiece[];
  moves: AnyMove[];
  timeControl: TimeControl;
  enableClick: boolean;
  enableDnd: boolean;
  turn: ColorEnum;
  realTurn: ColorEnum;
  status: GameStatusEnum;
  currentMoveIndex: number;
  lastMoveTimestamp: number;
  isTop: boolean;
  isMaterialDiffShown: boolean;
  allMaterialDifference: number;
  materialDifference: EachPieceType<number>;
  selectedPiece: PocketPiece | null;
  selectPiece(piece: IPiece | null): void;
  startDraggingPiece(e: React.MouseEvent | React.TouchEvent, location: RealPieceLocation): void;
}

type Props = OwnProps;

interface State {
  intervalActivated: boolean;
}

const ONE_HOUR = 60 * 60 * 1000;
const ONE_DAY = 24 * ONE_HOUR;

export default class GamePlayer extends React.Component<Props, State> {
  timeControlInterval?: number;
  state: State = {
    intervalActivated: false,
  };

  componentDidMount() {
    const {
      status,
      moves,
    } = this.props;

    if (moves.length >= 2 && status === GameStatusEnum.ONGOING) {
      this.activateInterval();
    }
  }

  componentWillUnmount() {
    clearInterval(this.timeControlInterval);
  }

  componentDidUpdate(prevProps: Props) {
    const {
      status,
      moves,
    } = this.props;

    if (status !== GameStatusEnum.ONGOING && prevProps.status === GameStatusEnum.ONGOING) {
      this.stopInterval();
    } else if (moves.length >= 2 && prevProps.moves.length < 2) {
      this.activateInterval();
    } else if (moves.length < 2 && prevProps.moves.length >= 2) {
      this.stopInterval();
    }
  }

  activateInterval() {
    const {
      status,
      timeControl,
    } = this.props;

    this.setState({
      intervalActivated: true,
    });

    if (status === GameStatusEnum.ONGOING && timeControl) {
      this.timeControlInterval = setInterval(() => this.forceUpdate(), 100) as any;
    }
  }

  getTime(): number {
    const {
      game,
      player,
      lastMoveTimestamp,
      realTurn,
      moves,
      currentMoveIndex,
    } = this.props;
    const adjustedLastMoveTimestamp = lastMoveTimestamp + game.timeDiff;

    if (currentMoveIndex !== moves.length - 1) {
      return moves[currentMoveIndex + 1].timeBeforeMove[player.color]!;
    }

    const timePassedSinceLastMove = (this.state.intervalActivated ? Date.now() : adjustedLastMoveTimestamp) - adjustedLastMoveTimestamp;

    return Math.max(
      player.color === realTurn
        ? player.time! - timePassedSinceLastMove
        : player.time!,
      0,
    );
  }

  getTimeString(): string {
    const time = this.getTime();
    const duration = moment.duration(time);

    if (time >= ONE_DAY) {
      const days = duration.days();
      const hours = duration.hours();

      return `${days}d${hours ? ` ${hours}h` : ''}`;
    }

    const minutes = _.padStart(`${duration.minutes()}`, 2, '0');
    const seconds = _.padStart(`${duration.seconds()}`, 2, '0');

    if (time > ONE_HOUR) {
      const hours = _.padStart(`${duration.hours()}`, 2, '0');

      return `${hours}:${minutes}:${seconds}`;
    }

    return `${minutes}:${seconds}`;
  }

  stopInterval() {
    clearInterval(this.timeControlInterval);

    this.setState({
      intervalActivated: false,
    });
  }

  render() {
    const {
      game,
      player,
      playingPlayer,
      pieces,
      enableClick,
      enableDnd,
      turn,
      realTurn,
      status,
      selectedPiece,
      timeControl,
      isTop,
      isMaterialDiffShown,
      allMaterialDifference,
      materialDifference,
      selectPiece,
      startDraggingPiece,
    } = this.props;
    const allMaterialDiffRelativeToPlayer = player.color === ColorEnum.WHITE
      ? allMaterialDifference
      : -allMaterialDifference;
    const active = player.color === realTurn && status === GameStatusEnum.ONGOING;
    const time = this.getTime();

    return (
      <div
        className={classNames('game-player', {
          active,
          top: isTop,
          'with-pocket': game.isPocketUsed,
          'with-material': isMaterialDiffShown,
        })}
      >
        {isMaterialDiffShown && (
          <div className="material-advantage">
            {_.map(materialDifference, (count, pieceType) => {
              if (game.isThreeCheck && pieceType === PieceTypeEnum.KING) {
                count = game.checksCount[player.color] * (player.color === ColorEnum.WHITE ? 1 : -1);
              }

              const isAdvantage = player.color === ColorEnum.WHITE ? count > 0 : count < 0;

              if (!isAdvantage) {
                return;
              }

              count = Math.abs(count);

              const pocketPiece = pocketPieces[player.color][pieceType as PieceTypeEnum];

              return (
                <div className="piece-advantage" key={pieceType}>
                  <Piece
                    color={player.color}
                    type={pocketPiece.type}
                    location={pocketPiece.location}
                  />
                  {count > 1 && (
                    <span className="count">
                      x{count}
                    </span>
                  )}
                </div>
              );
            })}
            {allMaterialDiffRelativeToPlayer !== 0 && (
              <span className="all-material-advantage">
                {allMaterialDiffRelativeToPlayer > 0 ? '+' : ''}{allMaterialDiffRelativeToPlayer}
              </span>
            )}
          </div>
        )}
        {game.isPocketUsed && (
          <PlayerPocket
            game={game}
            color={player.color}
            pocket={pieces.filter((piece) => Game.isPocketPiece(piece) && piece.color === player.color) as PocketPiece[]}
            enableClick={enableClick}
            enableDnd={enableDnd}
            selectedPiece={selectedPiece}
            selectPiece={selectPiece}
            startDraggingPiece={startDraggingPiece}
          />
        )}
        {timeControl ? (
          <div className={classNames('timer', {
            correspondence: timeControl.type === TimeControlEnum.CORRESPONDENCE,
            low: time <= timeControl.base / 6,
            critical: time <= timeControl.base / 12,
          })}>
            {this.getTimeString()}
          </div>
        ) : (
          <div className="turn">
            {
              active
                ? playingPlayer
                  ? player.id === playingPlayer.id
                    ? 'Your turn'
                    : 'Waiting for the opponent'
                  : `${COLOR_NAMES[player.color]} to move`
                : '\u00a0'
            }
          </div>
        )}
        <div className="name">
          <div
            className={classNames('color', { active: player.color === turn })}
            style={{ backgroundColor: player.color }}
          />
          {player.name}
        </div>
      </div>
    );
  }
}