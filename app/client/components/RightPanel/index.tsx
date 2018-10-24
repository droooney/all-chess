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
  StartingData,
  TimeControl,
  TimeControlEnum
} from '../../../types';
import { Game } from '../../helpers';

import MovesPanel from '../MovesPanel';
import RightPanelPlayer from '../RightPanelPlayer';

interface OwnProps {
  players: GamePlayers;
  player: Player | null;
  pieces: Piece[];
  startingData: StartingData;
  pocketPiecesUsed: PieceTypeEnum[];
  isPocketUsed: boolean;
  currentMoveIndex: number;
  timeControl: TimeControl;
  moves: AnyMove[];
  isBlackBase: boolean;
  pliesPerMove: number;
  status: GameStatusEnum;
  timeDiff: number;
  selectedPiece: PocketPiece | null;
  selectPiece(piece: Piece | null): void;
  moveBack(): void;
  moveForward(): void;
  navigateToMove(moveIndex: number): void;
  getPocketPiece(type: PieceTypeEnum, color: ColorEnum): PocketPiece | null;
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
      status,
      pliesPerMove,
      moves
    } = this.props;

    if (moves.length >= pliesPerMove && status === GameStatusEnum.ONGOING) {
      this.activateInterval();
    }

    document.addEventListener('keydown', this.onKeyDown);
  }

  componentDidUpdate(prevProps: Props) {
    const {
      status,
      moves,
      pliesPerMove
    } = this.props;

    if (status !== GameStatusEnum.ONGOING) {
      clearInterval(this.timeControlInterval);
    } else if (moves.length >= pliesPerMove && prevProps.moves.length < pliesPerMove) {
      this.activateInterval();
    }
  }

  componentWillUnmount() {
    clearInterval(this.timeControlInterval);

    document.removeEventListener('keydown', this.onKeyDown);
  }

  onKeyDown = (e: KeyboardEvent) => {
    const {
      moveBack,
      moveForward
    } = this.props;

    if (!e.target || !_.includes(INPUT_ELEMENTS, (e.target as HTMLElement).tagName.toLowerCase())) {
      if (e.key === 'ArrowLeft') {
        moveBack();
      } else if (e.key === 'ArrowRight') {
        moveForward();
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
      ? 1000
      : 60 * 1000;

    this.setState({
      intervalActivated: true
    });

    if (status === GameStatusEnum.ONGOING && timeControl) {
      this.timeControlInterval = setInterval(() => this.forceUpdate(), refreshInterval) as any;
    }
  }

  render() {
    const {
      players,
      player,
      pieces,
      startingData,
      pocketPiecesUsed,
      isPocketUsed,
      pliesPerMove,
      currentMoveIndex,
      moves,
      timeControl,
      isBlackBase,
      selectedPiece,
      getPocketPiece,
      selectPiece,
      moveBack,
      moveForward,
      navigateToMove
    } = this.props;
    const startingMoveIndex = startingData.startingMoveIndex;
    const realTurn = (moves.length + startingMoveIndex) % pliesPerMove === pliesPerMove - 1
      ? ColorEnum.BLACK
      : ColorEnum.WHITE;
    const topPlayer = isBlackBase
      ? players[ColorEnum.WHITE]
      : players[ColorEnum.BLACK];
    const bottomPlayer = isBlackBase
      ? players[ColorEnum.BLACK]
      : players[ColorEnum.WHITE];
    const lastMoveTimestamp = this.adjustServerTime(moves.length ? _.last(moves)!.timestamp : 0);
    const timePassedSinceLastMove = (this.state.intervalActivated ? Date.now() : lastMoveTimestamp) - lastMoveTimestamp;

    return (
      <div className="right-panel">

        <RightPanelPlayer
          player={topPlayer}
          currentPlayer={player}
          timePassedSinceLastMove={timePassedSinceLastMove}
          timeControl={timeControl}
          realTurn={realTurn}
          isTop
          isPocketUsed={isPocketUsed}
          pocketPiecesUsed={pocketPiecesUsed}
          pocket={pieces.filter((piece) => Game.isPocketPiece(piece) && piece.color === topPlayer.color) as PocketPiece[]}
          selectedPiece={selectedPiece}
          selectPiece={selectPiece}
          getPocketPiece={getPocketPiece}
        />

        <MovesPanel
          currentMoveIndex={currentMoveIndex}
          pliesPerMove={pliesPerMove}
          startingData={startingData}
          moves={moves}
          moveBack={moveBack}
          moveForward={moveForward}
          navigateToMove={navigateToMove}
        />

        <RightPanelPlayer
          player={bottomPlayer}
          currentPlayer={player}
          timePassedSinceLastMove={timePassedSinceLastMove}
          timeControl={timeControl}
          realTurn={realTurn}
          isTop={false}
          isPocketUsed={isPocketUsed}
          pocketPiecesUsed={pocketPiecesUsed}
          pocket={pieces.filter((piece) => Game.isPocketPiece(piece) && piece.color === bottomPlayer.color) as PocketPiece[]}
          selectedPiece={selectedPiece}
          selectPiece={selectPiece}
          getPocketPiece={getPocketPiece}
        />

      </div>
    );
  }
}
