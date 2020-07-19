import * as React from 'react';

import {
  GameResult
} from '../../../shared/types';
import {
  COLOR_NAMES,
  RESULT_REASON_NAMES
} from '../../../shared/constants';
import { Game } from 'client/helpers';

import GameVariantLink from '../GameVariantLink';

export interface OwnProps {
  game: Game;
  result: GameResult | null;
}

type Props = OwnProps;

export default class GameInfo extends React.Component<Props> {
  render() {
    const {
      game,
      result
    } = this.props;

    return (
      <React.Fragment>
        <div className="game-info">
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

          {result && (
            <div className="result">
              {result.winner ? `${COLOR_NAMES[result.winner]} won` : 'Draw'}
              {` (${RESULT_REASON_NAMES[result.reason]})`}
            </div>
          )}
        </div>
      </React.Fragment>
    );
  }
}
