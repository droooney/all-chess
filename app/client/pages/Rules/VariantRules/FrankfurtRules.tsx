import React from 'react';

import { GameVariantEnum } from 'shared/types';

import { Game } from 'client/helpers';

import GameVariantLinks from 'client/components/GameVariantLinks';

import Combination from '../Combination';
import Combinations from '../Combinations';
import Moves from '../Moves';
import Overview from '../Overview';
import RulesExample from '../RulesExample';

interface OwnProps {
  gameRef(game: Game): void;
}

type Props = OwnProps;

class FrankfurtRules extends React.PureComponent<Props> {
  render() {
    const {
      gameRef,
    } = this.props;

    return (
      <React.Fragment>
        <Overview>
          <p>
            Frankfurt chess is a variant in which a piece changes its type after it captures a piece.
          </p>
        </Overview>

        <Moves>
          <p>
            If a piece captures another piece its type becomes the captured piece type.
          </p>

          <RulesExample
            id="1"
            description="After Nxe5 the knight becomes the captured piece - a pawn"
            variants={[GameVariantEnum.FRANKFURT]}
            fen="r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3"
            moves="3. Nxe5"
            symbols={[
              ['f3->e5'],
            ]}
            gameRef={gameRef}
          />

          <p>
            If a king captures a piece it becomes a royal piece of that type.
            After that it won't have usual king moves as in standard chess.
          </p>

          <RulesExample
            id="2"
            description="The white king becomes a royal pawn and gets checkmated by the knight"
            variants={[GameVariantEnum.FRANKFURT]}
            fen="r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4"
            moves="4. Bxf7+ Kxf7 5. Ng5#"
            gameRef={gameRef}
          />

          <p>
            If a pawn (royal or not) captures a piece on the last rank it becomes that piece and doesn't promote, as it no longer is a pawn.
          </p>

          <RulesExample
            id="3"
            description="The h-pawn captures the knight on g8 and becomes a knight"
            variants={[GameVariantEnum.FRANKFURT]}
            fen="6n1/2k4P/8/8/8/8/1K6/8 w - - 0 42"
            moves="42. hxg8"
            gameRef={gameRef}
          />

          <p>
            If a royal piece is not a knight and it's moving in a direction its path can't contain any squares that are attacked.
          </p>

          <RulesExample
            id="4"
            description="Kb2 is a checkmate, as a2 and b1 become attacked by the king, and all other white royal rook moves go through these squares"
            variants={[GameVariantEnum.FRANKFURT]}
            fen="8/8/8/8/8/2kn4/8/R!7 b - - 0 32"
            moves="32... Kb2#"
            symbols={[
              ['c3->b2'],
              [
                'b2->a2:r', 'b2->b1:r',
                'a2:r', 'a3:y', 'a4:y', 'a5:y', 'a6:y', 'a7:y', 'a8:y',
                'b1:r', 'c1:y', 'd1:y', 'e1:y', 'f1:y', 'g1:y', 'h1:y',
              ],
            ]}
            gameRef={gameRef}
          />
        </Moves>

        <Combinations>
          <p>
            Frankfurt chess can't be combined with <GameVariantLinks variants={[
              GameVariantEnum.ABSORPTION, GameVariantEnum.ATOMIC, GameVariantEnum.BENEDICT_CHESS,
              GameVariantEnum.CIRCE, GameVariantEnum.CRAZYHOUSE,
            ]} />.
          </p>

          <Combination variant={GameVariantEnum.MADRASI}>
            <p>
              In Frankfurt chess + Madrasi chess a royal piece is paralysed only if it's attacked by the same royal piece.
            </p>
          </Combination>
        </Combinations>
      </React.Fragment>
    );
  }
}

export default FrankfurtRules;
