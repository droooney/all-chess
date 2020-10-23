import React from 'react';

import { GameVariantEnum } from 'shared/types';

import { Game } from 'client/helpers';

import GameVariantLinks from 'client/components/GameVariantLinks';

import Combinations from '../Combinations';
import List from '../List';
import Moves from '../Moves';
import Overview from '../Overview';
import RulesExample from '../RulesExample';
import RulesExampleLink from '../RulesExampleLink';
import Setup from '../Setup';

interface OwnProps {
  gameRef(game: Game): void;
}

type Props = OwnProps;

class CircularRules extends React.PureComponent<Props> {
  render() {
    const {
      gameRef,
    } = this.props;

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
            Pawn moves (see <RulesExampleLink id="2" />):
          </p>

          <List elements={[
            'white pawns on the 2nd rank move to the 8th rank promoting on the 8th',
            'white pawns on the 15th rank move to the 9th rank promoting on the 9th',
            'black pawns on the 7th rank move to the 1st rank promoting on the 1st',
            'black pawns on the 10th rank move to the 16th rank promoting on the 16th',
          ]} />

          <p>
            The rest of the pieces move exactly as in standard chess except pieces can't make full circle around the board stopping at the same square.
            There is no castling in Circular chess.
          </p>

          <RulesExample
            id="2"
            description="Pawn moves in circular chess"
            variants={[GameVariantEnum.CIRCULAR_CHESS]}
            moves="1. a4 d5 2. b14 c12"
            gameRef={gameRef}
          />
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
