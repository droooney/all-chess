import * as _ from 'lodash';
import * as React from 'react';

import {
  AnyMove,
  ColorEnum,
  GamePlayers,
  GameStatusEnum,
  Piece,
  PieceTypeEnum,
  Player,
  PocketPiece,
  RealPieceLocation,
  TimeControl,
  TimeControlEnum
} from '../../../types';
import { Game } from '../../helpers';
import { PIECES_WORTH } from '../../../shared/constants';

import MovesPanel from '../MovesPanel';
import RightPanelPlayer from '../RightPanelPlayer';

interface OwnProps {
  game: Game;
  players: GamePlayers;
  player: Player | null;
  pieces: readonly Piece[];
  currentMoveIndex: number;
  timeControl: TimeControl;
  moves: AnyMove[];
  enableClick: boolean;
  enableDnd: boolean;
  isBlackBase: boolean;
  status: GameStatusEnum;
  timeDiff: number;
  lastMoveTimestamp: number;
  selectedPiece: PocketPiece | null;
  selectPiece(piece: Piece | null): void;
  startDraggingPiece(e: React.MouseEvent, location: RealPieceLocation): void;
}

interface State {
  intervalActivated: boolean;
}

type Props = OwnProps;

const INPUT_ELEMENTS = ['input', 'textarea'];

export default class RightPanel extends React.Component<Props, State> {
  timeControlInterval?: number;
  state = {
    intervalActivated: false
  };

  componentDidMount() {
    const {
      game,
      status,
      moves
    } = this.props;

    if (moves.length >= game.pliesPerMove && status === GameStatusEnum.ONGOING) {
      this.activateInterval();
    }

    document.addEventListener('keydown', this.onKeyDown);
  }

  componentDidUpdate(prevProps: Props) {
    const {
      game,
      status,
      moves
    } = this.props;

    if (status !== GameStatusEnum.ONGOING && prevProps.status === GameStatusEnum.ONGOING) {
      this.stopInterval();
    } else if (moves.length >= game.pliesPerMove && prevProps.moves.length < game.pliesPerMove) {
      this.activateInterval();
    } else if (moves.length < game.pliesPerMove && prevProps.moves.length >= game.pliesPerMove) {
      this.stopInterval();
    }
  }

  componentWillUnmount() {
    clearInterval(this.timeControlInterval);

    document.removeEventListener('keydown', this.onKeyDown);
  }

  onKeyDown = (e: KeyboardEvent) => {
    const {
      game
    } = this.props;

    if (!e.target || !INPUT_ELEMENTS.includes((e.target as HTMLElement).tagName.toLowerCase())) {
      if (e.key === 'ArrowLeft') {
        game.moveBack();
      } else if (e.key === 'ArrowRight') {
        game.moveForward();
      } else if (e.key === 'ArrowUp') {
        game.navigateToMove(-1);
      } else if (e.key === 'ArrowDown') {
        game.navigateToMove(game.getUsedMoves().length - 1);
      }
    }
  };

  adjustServerTime(serverTime: number): number {
    return serverTime + this.props.timeDiff;
  }

  activateInterval() {
    const {
      status,
      timeControl
    } = this.props;
    const refreshInterval = timeControl && timeControl.type === TimeControlEnum.TIMER
      ? 100
      : 60 * 1000;

    this.setState({
      intervalActivated: true
    });

    if (status === GameStatusEnum.ONGOING && timeControl) {
      this.timeControlInterval = setInterval(() => this.forceUpdate(), refreshInterval) as any;
    }
  }

  stopInterval() {
    clearInterval(this.timeControlInterval);
    this.setState({
      intervalActivated: false
    });
  }

  render() {
    const {
      game,
      players,
      player,
      pieces,
      currentMoveIndex,
      lastMoveTimestamp,
      moves,
      timeControl,
      enableClick,
      enableDnd,
      isBlackBase,
      selectedPiece,
      selectPiece,
      startDraggingPiece
    } = this.props;
    const startingMoveIndex = game.startingData.startingMoveIndex;
    const realTurn = (moves.length + startingMoveIndex) % game.pliesPerMove === game.pliesPerMove - 1
      ? ColorEnum.BLACK
      : ColorEnum.WHITE;
    const topPlayer = isBlackBase
      ? players[ColorEnum.WHITE]
      : players[ColorEnum.BLACK];
    const bottomPlayer = isBlackBase
      ? players[ColorEnum.BLACK]
      : players[ColorEnum.WHITE];
    const adjustedLastMoveTimestamp = this.adjustServerTime(lastMoveTimestamp);
    const timePassedSinceLastMove = (this.state.intervalActivated ? Date.now() : adjustedLastMoveTimestamp) - adjustedLastMoveTimestamp;
    const materialDifference: Record<PieceTypeEnum, number> = {} as any;
    let allMaterialDifference = 0;

    if (game.needToCalculateMaterialDifference) {
      _.forEach(PieceTypeEnum, (pieceType) => {
        const getPiecesCount = (color: ColorEnum): number => (
          pieces.filter((piece) => (
            Game.isRealPiece(piece)
            && (piece.abilities || piece.type) === pieceType
            && piece.color === color
          )).length
        );

        const diff = materialDifference[pieceType] = getPiecesCount(ColorEnum.WHITE) - getPiecesCount(ColorEnum.BLACK);

        allMaterialDifference += diff * PIECES_WORTH[
          game.isCircularChess
            ? 'circular'
            : game.isHexagonalChess
              ? 'hexagonal'
              : 'orthodox'
        ][pieceType];
      });
    }

    return (
      <div className="right-panel">

        <RightPanelPlayer
          game={game}
          player={topPlayer}
          playingPlayer={player}
          timePassedSinceLastMove={timePassedSinceLastMove}
          timeControl={timeControl}
          realTurn={realTurn}
          enableClick={enableClick && !!player && topPlayer.login === player.login}
          enableDnd={enableDnd && !!player && topPlayer.login === player.login}
          isTop
          pocket={pieces.filter((piece) => Game.isPocketPiece(piece) && piece.color === topPlayer.color) as PocketPiece[]}
          allMaterialDifference={allMaterialDifference}
          materialDifference={materialDifference}
          selectedPiece={selectedPiece}
          selectPiece={selectPiece}
          startDraggingPiece={startDraggingPiece}
        />

        <MovesPanel
          game={game}
          currentMoveIndex={currentMoveIndex}
          moves={moves}
        />

        <RightPanelPlayer
          game={game}
          player={bottomPlayer}
          playingPlayer={player}
          timePassedSinceLastMove={timePassedSinceLastMove}
          timeControl={timeControl}
          realTurn={realTurn}
          enableClick={enableClick && !!player && bottomPlayer.login === player.login}
          enableDnd={enableDnd && !!player && bottomPlayer.login === player.login}
          isTop={false}
          pocket={pieces.filter((piece) => Game.isPocketPiece(piece) && piece.color === bottomPlayer.color) as PocketPiece[]}
          allMaterialDifference={allMaterialDifference}
          materialDifference={materialDifference}
          selectedPiece={selectedPiece}
          selectPiece={selectPiece}
          startDraggingPiece={startDraggingPiece}
        />

      </div>
    );
  }
}
