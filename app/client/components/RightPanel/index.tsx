import * as _ from 'lodash';
import * as React from 'react';

import {
  ColorEnum,
  ExtendedMove,
  GamePlayers,
  GameStatusEnum,
  TimeControlEnum
} from '../../../types';

import RightPanelPlayer from '../RightPanelPlayer';

interface OwnProps {
  players: GamePlayers;
  lastMoveTimestamp: number;
  timeControl: TimeControlEnum;
  moves: ExtendedMove[];
  turn: ColorEnum;
  isBlackBase: boolean;
  status: GameStatusEnum;
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

      if (maxScroll - movesElem.scrollTop <= lastMoveRow.clientHeight) {
        movesElem.scrollTop = maxScroll;
      }
    }
  }

  componentWillUnmount() {
    clearInterval(this.timeControlInterval);
  }

  activateInterval() {
    const {
      status,
      timeControl
    } = this.props;
    const refreshInterval = timeControl === TimeControlEnum.TIMER
      ? 1000
      : 60 * 1000;

    this.setState({
      intervalActivated: true
    });

    if (status === GameStatusEnum.ONGOING && timeControl !== TimeControlEnum.NONE) {
      this.timeControlInterval = setInterval(() => this.forceUpdate(), refreshInterval) as any;
    }
  }

  render() {
    const {
      players,
      lastMoveTimestamp,
      moves,
      timeControl,
      turn,
      isBlackBase
    } = this.props;
    const topPlayer = isBlackBase
      ? players[ColorEnum.WHITE]
      : players[ColorEnum.BLACK];
    const bottomPlayer = isBlackBase
      ? players[ColorEnum.BLACK]
      : players[ColorEnum.WHITE];
    const timePassedSinceLastMove = (this.state.intervalActivated ? Date.now() : lastMoveTimestamp) - lastMoveTimestamp;

    return (
      <div className="right-panel">

        <RightPanelPlayer
          player={topPlayer}
          timePassedSinceLastMove={timePassedSinceLastMove}
          timeControl={timeControl}
          turn={turn}
          isTop
        />

        <div className="moves" ref={this.movesRef}>
          {_.chunk(moves, 2).map((moves, index) => (
            <div key={index} className="move-row">
              <div className="move-index">{index + 1}</div>
              {moves.map((move, index) => (
                <div key={index} className="move">
                  {move.figurine}
                </div>
              ))}
            </div>
          ))}
        </div>

        <RightPanelPlayer
          player={bottomPlayer}
          timePassedSinceLastMove={timePassedSinceLastMove}
          timeControl={timeControl}
          turn={turn}
          isTop={false}
        />

      </div>
    );
  }
}
