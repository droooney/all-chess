import React from 'react';

import { GameVariantEnum } from 'shared/types';

import { Game } from 'client/helpers';

import GameVariantLinks from 'client/components/GameVariantLinks';

import CombinationLinkSection from '../CombinationLinkSection';
import Combinations from '../Combinations';
import Moves from '../Moves';
import Overview from '../Overview';
import RulesExample from '../RulesExample';

interface OwnProps {
  gameRef(game: Game): void;
}

type Props = OwnProps;

class MadrasiRules extends React.PureComponent<Props> {
  render() {
    const {
      gameRef,
    } = this.props;

    return (
      <React.Fragment>
        <Overview>
          <p>
            Madrasi chess is a variant in which pieces can become paralysed.
          </p>
        </Overview>

        <Moves>
          <p>
            If two pieces of the same type but of opposite color attack each other they are paralysed.
            In this state they can't move and they don't give check.
          </p>

          <RulesExample
            id="1"
            description="Black saves the knight by paralysing the pawn on e5"
            variants={[GameVariantEnum.MADRASI]}
            fen="rnbqkb1r/pppppppp/5n2/4P3/8/8/PPPP1PPP/RNBQKBNR b KQkq - 0 2"
            moves="2... d6"
            symbols={[
              ['d7->d6'],
            ]}
            gameRef={gameRef}
          />

          <RulesExample
            id="2"
            description="Qxf7+ is not a checkmate because Black can paralyse the white queen"
            variants={[GameVariantEnum.MADRASI]}
            fen="r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4"
            moves="4. Qxf7+ Qe7"
            symbols={[
              ['h5->f7'],
              ['d8->e7'],
            ]}
            gameRef={gameRef}
          />
        </Moves>

        <Combinations>
          <p>
            Madrasi chess can't be combined with <GameVariantLinks variants={[GameVariantEnum.ABSORPTION, GameVariantEnum.ANTICHESS]} />.
          </p>

          <CombinationLinkSection
            from={GameVariantEnum.MADRASI}
            to={GameVariantEnum.BENEDICT_CHESS}
          />
        </Combinations>
      </React.Fragment>
    );
  }
}

export default MadrasiRules;
