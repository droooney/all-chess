import React from 'react';

import { GameVariantEnum } from 'shared/types';

import { Game } from 'client/helpers';

import GameVariantLinks from 'client/components/GameVariantLinks';

import CombinationLinkSection from '../CombinationLinkSection';
import Combinations from '../Combinations';
import Moves from '../Moves';
import Overview from '../Overview';
import RulesExample from '../RulesExample';
import Setup from '../Setup';

interface OwnProps {
  gameRef(game: Game): void;
}

type Props = OwnProps;

class HexagonalRules extends React.PureComponent<Props> {
  render() {
    return (
      <React.Fragment>
        <Overview>
          <p>
            Hexagonal chess is a variant that is played on a board with hexagon squares.
          </p>
        </Overview>

        <Setup>
          <RulesExample
            id="1"
            description="Starting position in Hexagonal chess"
            variants={[GameVariantEnum.HEXAGONAL_CHESS]}
          />
        </Setup>

        <Moves>
          <p>
            The following diagrams show how the pieces move in Hexagonal chess:
          </p>

          <RulesExample
            id="2"
            description="Knight moves"
            variants={[GameVariantEnum.HEXAGONAL_CHESS]}
            fen="1/3/5/7/9/5N5/11/11/11/11/11 w - - 0 1"
            symbols={[
              ['d3', 'e3', 'g3', 'h3', 'c4', 'c5', 'i4', 'i5', 'd7', 'e8', 'g8', 'h7'],
            ]}
          />

          <RulesExample
            id="3"
            description="Bishop moves"
            variants={[GameVariantEnum.HEXAGONAL_CHESS]}
            fen="1/3/5/7/9/5B5/11/11/11/11/11 w - - 0 1"
            symbols={[
              ['e4', 'd2', 'g4', 'h2', 'd5', 'b4', 'h5', 'j4', 'e7', 'd8', 'g7', 'h8'],
            ]}
          />

          <RulesExample
            id="4"
            description="Rook moves"
            variants={[GameVariantEnum.HEXAGONAL_CHESS]}
            fen="1/3/5/7/9/5R5/11/11/11/11/11 w - - 0 1"
            symbols={[
              [
                'f5', 'f4', 'f3', 'f2', 'f1',
                'e5', 'd4', 'c3', 'b2', 'a1',
                'g5', 'h4', 'i3', 'j2', 'k1',
                'e6', 'd6', 'c6', 'b6', 'a6',
                'g6', 'h6', 'i6', 'j6', 'k6',
                'f7', 'f8', 'f9', 'f10', 'f11',
              ],
            ]}
          />

          <RulesExample
            id="5"
            description="Pawn moves: green arrows - standard moves, red arrows - captures, blue circles - promotion squares"
            variants={[GameVariantEnum.HEXAGONAL_CHESS]}
            fen="1/3/5/7/6p2/11/11/11/3P7/11/11 w - - 0 1"
            symbols={[
              [
                'd3->d4', 'd3->c3:r', 'd3->e4:r',
                'h7->h6', 'h7->g7:r', 'h7->i6:r',
                'a1:b', 'b1:b', 'c1:b', 'd1:b', 'e1:b', 'f1:b', 'g1:b', 'h1:b', 'i1:b', 'j1:b', 'k1:b',
                'a6:b', 'b7:b', 'c8:b', 'd9:b', 'e10:b', 'f11:b', 'g10:b', 'h9:b', 'i8:b', 'j7:b', 'k6:b',
              ],
            ]}
          />

          <p>
            Queen combines movements of Rook and Bishop.
            King moves like Queen, but only one square in each direction.
            There is no castling in Hexagonal chess.
          </p>
        </Moves>

        <Combinations>
          <p>
            Hexagonal chess can't be combined with <GameVariantLinks variants={[
              GameVariantEnum.BENEDICT_CHESS, GameVariantEnum.CIRCE,
              GameVariantEnum.CIRCULAR_CHESS, GameVariantEnum.CYLINDER_CHESS,
            ]} />.
          </p>

          <CombinationLinkSection
            from={GameVariantEnum.HEXAGONAL_CHESS}
            to={GameVariantEnum.ATOMIC}
          />

          <CombinationLinkSection
            from={GameVariantEnum.HEXAGONAL_CHESS}
            to={GameVariantEnum.KING_OF_THE_HILL}
          />
        </Combinations>
      </React.Fragment>
    );
  }
}

export default HexagonalRules;
