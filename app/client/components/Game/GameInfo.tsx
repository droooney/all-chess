import classNames from 'classnames';
import * as React from 'react';

import { COLOR_NAMES, RESULT_REASON_NAMES, SPEED_TYPE_NAMES } from 'shared/constants';

import { GameResult, GameStatusEnum, Player } from 'shared/types';

import { Game } from 'client/helpers';

import GameVariantLink from '../GameVariantLink';

export interface OwnProps {
  game: Game;
  player: Player | null;
  result: GameResult | null;
  status: GameStatusEnum;
}

type Props = OwnProps;

export default class GameInfo extends React.Component<Props> {
  render() {
    const {
      game,
      player,
      result,
      status,
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
          <div className="game-type">
            {game.rated ? 'Rated' : 'Unrated'} {SPEED_TYPE_NAMES[game.getSpeedType()]}
            {' - '}{Game.getTimeControlString(game.timeControl)}
          </div>

          <div className="variants">
            <span className="variants-header">
              Variants:
            </span>
            {game.variants.length ? game.variants.map((variant, index) => (
              <React.Fragment key={variant}>
                {index !== 0 && ', '}

                <GameVariantLink
                  variant={variant}
                  className="variant"
                />
              </React.Fragment>
            )) : ' none'}
          </div>

          <div className={classNames('result', { aborted: status === GameStatusEnum.ABORTED })}>
            {result ? (
              <React.Fragment>
                {result.winner ? `${COLOR_NAMES[result.winner]} won` : 'Draw'}
                {` (${RESULT_REASON_NAMES[result.reason]})`}
              </React.Fragment>
            ) : (
              status === GameStatusEnum.ABORTED
                ? 'Game aborted'
                : '\u00a0'
            )}
          </div>
        </div>
      </React.Fragment>
    );
  }
}
