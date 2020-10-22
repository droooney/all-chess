import React from 'react';

import { GameVariantEnum } from 'shared/types';

import { Game } from 'client/helpers';

import GameVariantLinks from 'client/components/GameVariantLinks';

import RulesExample from '../RulesExample';
import Combinations from '../Combinations';
import Overview from '../Overview';
import Moves from '../Moves';
import Setup from '../Setup';

interface OwnProps {
  gameRef(game: Game): void;
}

type Props = OwnProps;

class CircularRules extends React.PureComponent<Props> {
  render() {
    return (
      <React.Fragment>
        <Overview>
          <p>
            Circular chess is a variant which is played on a circular board.
          </p>
        </Overview>

        <Setup>
          <RulesExample
            id="1"
            description="Starting position in Circular chess"
            variants={[GameVariantEnum.CIRCULAR_CHESS]}
          />
        </Setup>

        <Moves>
          <p>
            The pieces move exactly as in standard chess except pieces can't make full circle stopping at the same square.
          </p>
        </Moves>

        <Combinations>
          <p>
            Circular chess can't be combined with <GameVariantLinks variants={[
              GameVariantEnum.CYLINDER_CHESS, GameVariantEnum.HEXAGONAL_CHESS, GameVariantEnum.KING_OF_THE_HILL,
            ]} />.
          </p>
        </Combinations>
      </React.Fragment>
    );
  }
}

export default CircularRules;
