import moment = require('moment');
import * as React from 'react';

import {
  ColorEnum,
  Player,
  TimeControlEnum
} from '../../../types';

interface OwnProps {
  player: Player;
  timePassedSinceLastMove: number;
  timeControl: TimeControlEnum;
  turn: ColorEnum;
  isTop: boolean;
}

type Props = OwnProps;

const ONE_HOUR = 60 * 60 * 1000;
const ONE_DAY = 24 * ONE_HOUR;

export default class RightPanelPlayer extends React.Component<Props> {
  getTimeString(time: number): string {
    if (time > ONE_DAY) {
      const days = Math.floor(moment.duration(time).asDays());

      return `${days} ${moment(time).format('HH:mm:ss')}`;
    }

    if (time > ONE_HOUR) {
      return moment(time).format('HH:mm:ss');
    }

    return moment(time).format('mm:ss');
  }

  render() {
    const {
      player,
      timePassedSinceLastMove,
      turn,
      timeControl,
      isTop
    } = this.props;

    return (
      <div className={`player ${isTop ? 'top' : 'bottom'}`}>

        {timeControl !== TimeControlEnum.NONE && (
          <div className="timer">
            {this.getTimeString(
              player.color === turn
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
