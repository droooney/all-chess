import React from 'react';

import { GameVariantEnum } from 'shared/types';

import { Game } from 'client/helpers';

import GameVariantLinks from 'client/components/GameVariantLinks';

import RulesExample from '../RulesExample';
import RulesExampleLink from '../RulesExampleLink';
import Overview from '../Overview';
import Moves from '../Moves';
import Combinations from '../Combinations';
import Combination from '../Combination';

interface OwnProps {
  gameRef(game: Game): void;
}

type Props = OwnProps;

class BenedictRules extends React.PureComponent<Props> {
  render() {
    const {
      gameRef,
    } = this.props;

    return (
      <React.Fragment>
        <Overview>
          <p>
            Benedict chess is a variant in which there are no captures and pieces change color when being attacked.
            Changing opponent's king color wins the game.
          </p>
        </Overview>

        <Moves>
          <p>
            Any pseudo-legal move is legal in Benedict chess. After the move all opponent's pieces which are attacked
            by the moved piece are flipped (change color). Other opponent's pieces which are attacked by other pieces
            are not flipped.
          </p>

          <RulesExample
            id="1"
            description="c3 flips the knight on d4. The queen and the pawn on a7 are not flipped by the knight on c6"
            variants={[GameVariantEnum.BENEDICT_CHESS]}
            fen="r1bqk1nr/pppp1ppp/2N5/2b1p3/3nP3/8/PPPP1PPP/RNBQKB1R w KQkq - 6 4"
            moves="4. c3"
            symbols={[
              ['c2->c3', 'c3->d4:r'],
            ]}
            gameRef={gameRef}
          />
        </Moves>

        <Combinations>
          <p>
            Benedict chess can't be combined with any variant that involves special rules for captures. This includes
            {' '}<GameVariantLinks variants={[
              GameVariantEnum.ANTICHESS, GameVariantEnum.ATOMIC, GameVariantEnum.ABSORPTION,
              GameVariantEnum.CIRCE, GameVariantEnum.COMPENSATION_CHESS, GameVariantEnum.CRAZYHOUSE,
              GameVariantEnum.FRANKFURT,
            ]} />. Additionally it can't be combined with <GameVariantLinks variants={[
              GameVariantEnum.KING_OF_THE_HILL, GameVariantEnum.THREE_CHECK, GameVariantEnum.HEXAGONAL_CHESS,
            ]} />.
          </p>

          <Combination variant={GameVariantEnum.MADRASI}>
            <p>
              In Benedict chess + Madrasi if the moved piece is paralysed after the move it doesn't flip any opponent pieces
              {' '}(see <RulesExampleLink id="2" />).
            </p>

            <RulesExample
              id="2"
              description="After Qg5 both queens become paralysed and the black queen no longer flips any pieces"
              variants={[GameVariantEnum.BENEDICT_CHESS, GameVariantEnum.MADRASI]}
              fen="rnbqkbnr/pppp1PpP/8/4P2Q/4P3/8/PPPP1PPP/RNB1KBNR b KQkq - 3 2"
              moves="2... Qg5"
              symbols={[
                ['d8->g5'],
                ['g5:y', 'h5:y'],
              ]}
              gameRef={gameRef}
            />
          </Combination>

          <Combination variant={GameVariantEnum.PATROL}>
            <p>
              In Benedict chess + Patrol chess if the moved piece is not patrolled after the move it doesn't flip any opponent pieces
              {' '}(see <RulesExampleLink id="3" />).
            </p>

            <RulesExample
              id="2"
              description="After Qg5 the queen is not patrolled on g5 so it doesn't flip any pieces"
              variants={[GameVariantEnum.BENEDICT_CHESS, GameVariantEnum.PATROL]}
              fen="rnbqkbnr/pppp1PpP/8/4P2Q/4P3/8/PPPP1PPP/RNB1KBNR b KQkq - 3 2"
              moves="2... Qg5"
              symbols={[
                ['d8->g5'],
                ['g5:y'],
              ]}
              gameRef={gameRef}
            />
          </Combination>

          <Combination variant={GameVariantEnum.DARK_CHESS}>
            <p>
              In Benedict chess + Dark chess pawns do not "see" diagonally because diagonal moves do not exist in Benedict chess.
            </p>
          </Combination>
        </Combinations>
      </React.Fragment>
    );
  }
}

export default BenedictRules;
