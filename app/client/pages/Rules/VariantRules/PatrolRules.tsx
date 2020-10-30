import React from 'react';

import { GameVariantEnum } from 'shared/types';

import { Game } from 'client/helpers';

import GameVariantLink from 'client/components/GameVariantLink';

import Combination from '../Combination';
import CombinationLinkSection from '../CombinationLinkSection';
import Combinations from '../Combinations';
import Moves from '../Moves';
import Overview from '../Overview';
import RulesExample from '../RulesExample';

interface OwnProps {
  gameRef(game: Game): void;
}

type Props = OwnProps;

class PatrolRules extends React.PureComponent<Props> {
  render() {
    const {
      gameRef,
    } = this.props;

    return (
      <React.Fragment>
        <Overview>
          <p>
            Patrol chess is a variant in which pieces have to be protected to capture other pieces and give check.
          </p>
        </Overview>

        <Moves>
          <p>
            In order for a piece to capture another piece or give a check it has to be patrolled by another piece.
            A piece is patrolled if it's protected by another piece.
          </p>

          <RulesExample
            id="1"
            description="The pawn on e4 can't capture the pawn on d5 because it's not patrolled"
            variants={[GameVariantEnum.PATROL]}
            fen="rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1"
            moves="1... d5"
            symbols={[
              ['d7->d5'],
              ['e4:r', 'e4->d5:y'],
            ]}
          />

          <RulesExample
            id="2"
            description="The white king is not in check because the black queen is not patrolled"
            variants={[GameVariantEnum.PATROL]}
            fen="rnbqkbnr/pppp1ppp/8/4p3/5PP1/8/PPPPP2P/RNBQKBNR b KQkq g3 0 2"
            moves="2... Qh4"
            symbols={[
              ['d8->h4'],
              ['h4:r', 'h4->e1:y'],
            ]}
          />

          <p>
            If the piece is not patrolled it can't prevent the opponent's king from castling.
          </p>

          <RulesExample
            id="3"
            description="The bishop on a3 doesn't prevent the black king from castling because it's not patrolled"
            variants={[GameVariantEnum.PATROL]}
            fen="rnbqk2r/pppp1pbp/5np1/4p3/2B1P3/BPN5/P1PP1PPP/R2QK1NR b KQkq - 3 5"
            moves="5... O-O"
            symbols={[
              ['a3:b', 'a3->f8:y'],
            ]}
            gameRef={gameRef}
          />

          <p>
            Because a piece has to be patrolled to give check there are additional ways to defend from check in Patrol chess.
          </p>

          <RulesExample
            id="4"
            description="After Qe7+ there are multiple ways to defend from the check: capture the bishop or block the line of defense so the queen is not patrolled; also Kxe7 is an option"
            variants={[GameVariantEnum.PATROL]}
            fen="2q1k3/1n6/8/2B5/8/3K4/8/4Q3 w - - 0 31"
            moves="31. Qe7+"
            symbols={[
              [],
              ['b7->c5:b', 'b7->d6:b', 'e8->e7:b'],
            ]}
            gameRef={gameRef}
          />
        </Moves>

        <Combinations>
          <p>
            The only variant Patrol chess can't be combined is <GameVariantLink variant={GameVariantEnum.ANTICHESS} />.
          </p>

          <CombinationLinkSection
            from={GameVariantEnum.PATROL}
            to={GameVariantEnum.BENEDICT_CHESS}
          />

          <CombinationLinkSection
            from={GameVariantEnum.PATROL}
            to={GameVariantEnum.DARK_CHESS}
          />

          <Combination variant={GameVariantEnum.MADRASI}>
            <p>
              In Patrol chess + Madrasi if a piece is paralysed it doesn't patrol other pieces.
            </p>

            <RulesExample
              id="5"
              description="After Nxe4 the knight on c3 becomes paralysed, therefore the bishop on b5 is not patrolled and doesn't give check"
              variants={[GameVariantEnum.PATROL, GameVariantEnum.MADRASI]}
              fen="rnbqkb1r/ppp1pppp/5n2/1B1p4/4P3/2N5/PPPP1PPP/R1BQK1NR b KQkq - 3 3"
              moves="3... Nxe4"
              symbols={[
                ['f6->e4'],
              ]}
              gameRef={gameRef}
            />
          </Combination>
        </Combinations>
      </React.Fragment>
    );
  }
}

export default PatrolRules;
