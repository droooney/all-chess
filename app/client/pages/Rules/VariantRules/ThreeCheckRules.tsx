import React from 'react';

import { GameVariantEnum } from 'shared/types';

import { Game } from 'client/helpers';

import GameVariantLinks from 'client/components/GameVariantLinks';

import RulesExample from '../RulesExample';
import Overview from '../Overview';
import GameEnd from '../GameEnd';
import Combinations from '../Combinations';

interface OwnProps {
  gameRef(game: Game): void;
}

type Props = OwnProps;

class ThreeCheckRules extends React.PureComponent<Props> {
  render() {
    const {
      gameRef,
    } = this.props;

    return (
      <React.Fragment>
        <Overview>
          <p>
            Three-check is a variant where making 3 checks counts as a win.
          </p>
        </Overview>

        <GameEnd>
          <p>
            Additional way to win the game is making 3 checks throughout the whole game.
          </p>

          <RulesExample
            id="1"
            description="White wins by making 3 checks"
            variants={[GameVariantEnum.THREE_CHECK]}
            fen="r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/8/PPPP1PPP/RNBQK1NR w KQkq - 2 3 +0+0"
            moves="3. Bxf7+ Kxf7 4. Qh5+ g6 5. Qxg6#"
            gameRef={gameRef}
          />
        </GameEnd>

        <Combinations>
          <p>
            Three-check can't be combined with any variant that has no checks. This includes
            {' '}<GameVariantLinks variants={[
              GameVariantEnum.DARK_CHESS, GameVariantEnum.ATOMIC,
              GameVariantEnum.BENEDICT_CHESS, GameVariantEnum.ANTICHESS,
            ]} />.
          </p>
        </Combinations>
      </React.Fragment>
    );
  }
}

export default ThreeCheckRules;
