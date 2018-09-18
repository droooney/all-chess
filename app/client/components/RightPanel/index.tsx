import * as _ from 'lodash';
import * as React from 'react';

import {
  ColorEnum,
  ExtendedMove,
  GamePlayers,
  GameStatusEnum,
  Piece as IPiece,
  Player,
  Pocket,
  PocketPiece,
  TimeControl,
  TimeControlEnum
} from '../../../types';

import RightPanelPlayer from '../RightPanelPlayer';
import classNames = require('classnames');

interface OwnProps {
  players: GamePlayers;
  player: Player | null;
  pocket: Pocket;
  isPocketUsed: boolean;
  currentMoveIndex: number;
  timeControl: TimeControl;
  moves: ExtendedMove[];
  isBlackBase: boolean;
  isMonsterChess: boolean;
  status: GameStatusEnum;
  timeDiff: number;
  selectedPiece: PocketPiece | null;
  selectPiece(piece: IPiece | null): void;
  moveBack(): void;
  moveForward(): void;
  navigateToMove(moveIndex: number): void;
}

interface State {
  intervalActivated: boolean;
}

type Props = OwnProps;

export default class RightPanel extends React.Component<Props, State> {
  movesRef = React.createRef<HTMLDivElement>();
  timeControlInterval?: number;
  state = {
    intervalActivated: false
  };

  componentDidMount() {
    const {
      status,
      moves
    } = this.props;
    const movesElem = this.movesRef.current!;

    movesElem.scrollTop = movesElem.scrollHeight - movesElem.clientHeight;

    if (moves.length > 1 && status === GameStatusEnum.ONGOING) {
      this.activateInterval();
    }

    document.addEventListener('keydown', this.onKeyDown);
  }

  componentDidUpdate(prevProps: Props) {
    if (this.props.status !== GameStatusEnum.ONGOING) {
      clearInterval(this.timeControlInterval);
    } else if (this.props.moves.length > 1 && prevProps.moves.length <= 1) {
      this.activateInterval();
    }

    if (this.props.moves.length > prevProps.moves.length) {
      const movesElem = this.movesRef.current!;
      const lastMoveRow = _.last(movesElem.children)!;
      const maxScroll = movesElem.scrollHeight - movesElem.clientHeight;

      if (maxScroll - movesElem.scrollTop - 10 <= lastMoveRow.clientHeight) {
        movesElem.scrollTop = maxScroll;
      }
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

    if (e.key === 'ArrowLeft') {
      moveBack();
    } else if (e.key === 'ArrowRight') {
      moveForward();
    }
  };

  navigateToMove(moveIndex: number) {
    this.props.navigateToMove(moveIndex);
  }

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
      pocket,
      isPocketUsed,
      isMonsterChess,
      currentMoveIndex,
      moves,
      timeControl,
      isBlackBase,
      selectedPiece,
      selectPiece,
      navigateToMove
    } = this.props;
    const realTurn = moves.length % 2
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
    const movesChunkSize = isMonsterChess ? 3 : 2;

    return (
      <div className="right-panel">

        <RightPanelPlayer
          player={topPlayer}
          currentPlayer={player}
          timePassedSinceLastMove={timePassedSinceLastMove}
          timeControl={timeControl}
          turn={realTurn}
          isTop
          pocket={isPocketUsed ? pocket[topPlayer.color] : null}
          selectedPiece={selectedPiece}
          selectPiece={selectPiece}
        />

        <div className="moves" ref={this.movesRef}>
          {_.chunk(moves, movesChunkSize).map((moves, index) => (
            <div key={index} className={`move-row moves-${movesChunkSize}`}>
              <div className="move-index">{index + 1}</div>
              {moves.map((move, turn) => {
                const moveIndex = index * movesChunkSize + turn;

                return (
                  <div
                    key={turn}
                    className={classNames('move', {
                      current: moveIndex === currentMoveIndex
                    })}
                    onClick={() => navigateToMove(moveIndex)}
                  >
                    {move.figurine}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        <RightPanelPlayer
          player={bottomPlayer}
          currentPlayer={player}
          timePassedSinceLastMove={timePassedSinceLastMove}
          timeControl={timeControl}
          turn={realTurn}
          isTop={false}
          pocket={isPocketUsed ? pocket[bottomPlayer.color] : null}
          selectedPiece={selectedPiece}
          selectPiece={selectPiece}
        />

      </div>
    );
  }
}
