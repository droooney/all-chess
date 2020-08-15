import * as React from 'react';
import classNames from 'classnames';

import {
  COLOR_NAMES,
  RESULT_REASON_NAMES,
} from 'shared/constants';

import {
  GameResult,
  Player,
} from 'shared/types';

import { Game } from 'client/helpers';

import GameVariantLink from '../GameVariantLink';

export interface OwnProps {
  game: Game;
  player: Player | null;
  result: GameResult | null;
}

type Props = OwnProps;

export default class GameInfo extends React.Component<Props> {
  render() {
    const {
      game,
      player,
      result,
    } = this.props;

    return (
      <React.Fragment>
        <div
          className={classNames('game-info', player && result && (
            result.winner
              ? result.winner === player.color
                ? 'win'
                : 'loss'
              : 'tie'
          ))}
        >
          <div className="time-control">
            Time control: {Game.getTimeControlString(game.timeControl)}
          </div>

          <div className="variants">
            <span className="variants-header">
              Variants:
            </span>
            {game.variants.length ? game.variants.map((variant, ix) => (
              <React.Fragment key={variant}>
                {' '}
                <GameVariantLink
                  variant={variant}
                  className="variant"
                />
                {ix === game.variants.length - 1 ? '' : ','}
              </React.Fragment>
            )) : ' none'}
          </div>

          <div className="result">
            {result ? (
              <React.Fragment>
                {result.winner ? `${COLOR_NAMES[result.winner]} won` : 'Draw'}
                {` (${RESULT_REASON_NAMES[result.reason]})`}
              </React.Fragment>
            ) : '\u00a0'}
          </div>
        </div>
      </React.Fragment>
    );
  }
}
