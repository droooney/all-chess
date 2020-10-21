import * as React from 'react';

import { GameVariantEnum } from 'shared/types';

import { Game } from 'client/helpers';

import GameVariantLink from 'client/components/GameVariantLink';
import GameVariantLinks from 'client/components/GameVariantLinks';

import RulesExampleLink from '../RulesExampleLink';
import RulesExample from '../RulesExample';
import Overview from '../Overview';
import Combinations from '../Combinations';
import Setup from '../Setup';

interface OwnProps {
  gameRef(game: Game): void;
}

type Props = OwnProps;

export default class Chess960Rules extends React.Component<Props> {
  render() {
    const {
      gameRef,
    } = this.props;

    return (
      <React.Fragment>
        <Overview>
          <p>
            Chess 960 is a variant where the pieces setup is picked randomly from 960 possible positions.
          </p>
        </Overview>

        <Setup>
          <p>
            White's pieces are placed according to the following rules:

            <br />
            <br />

            - the bishops are placed on squares of the different colors
            <br />
            - the king is placed between the rooks
            <br />
            <br />
            Then Black's pieces are placed symmetrically.
          </p>

          <RulesExample
            id="1"
            description="Random chess 960 position"
            variants={[GameVariantEnum.CHESS_960]}
            fen="nnbrqbkr/pppppppp/8/8/8/8/PPPPPPPP/NNBRQBKR w KQkq - 0 1"
          />
        </Setup>

        <section>
          <h2 id="castling">
            Castling
          </h2>

          <p>
            Though rules of castling are different from the standard chess, some of the rules stand:

            <br />
            <br />

            - after king-side castling the king ends up on the g-file and the rook on the f-file (on a 10x8 board i-file and h-file respectively)
            <br />
            - after queen-side castling the king ends up on the c-file and the rook on the d-file
            <br />
            - the king and the castling rook haven't moved previously in the game
            <br />
            - all the squares between the king's initial and final position
            (including the initial and final squares) are not under attack
            (except when combined with a variant in which there are no checks, i.e. <GameVariantLink variant={GameVariantEnum.ATOMIC} /> or
            {' '}<GameVariantLink variant={GameVariantEnum.DARK_CHESS} />)
            <br />
            - all the squares between the king's initial position and final position
            and all the squares between the castling rook's initial and final position are empty (with the exception of these two pieces)

            <br />
            <br />

            Basically there are six types of castling:

            <br />
            <br />

            - the standard one: both the king and the rook's final positions are empty before the castling (<RulesExampleLink id="2" /> - White)
            <br />
            - the king's initial and final position is the same square (<RulesExampleLink id="3" /> - Black)
            <br />
            - the rook's initial and final position is the same square (<RulesExampleLink id="4" /> - White)
            <br />
            - the king's final position is the rook initial position (<RulesExampleLink id="3" /> - White)
            <br />
            - the rook's final position is the king initial position (<RulesExampleLink id="4" /> - Black)
            <br />
            - the king and the rook swap places with each other (<RulesExampleLink id="2" /> - Black)

            <br />
            <br />

            To avoid castling ambiguities, the castling in Chess 960 is performed by moving the king onto the castling rook.
          </p>

          <RulesExample
            id="2"
            description="The white king and rook end up on previously empty squares. The black king and rook swap places."
            variants={[GameVariantEnum.CHESS_960]}
            fen="2rkrqbb/1ppppppp/1pn5/8/5P2/5Q2/PPPPP1PP/NNRKR2B w KQkq - 2 4"
            moves="4. O-O O-O-O"
            symbols={[
              ['d1->g1', 'e1->f1:r'],
              ['d8->c8', 'c8->d8:r'],
            ]}
            gameRef={gameRef}
          />

          <RulesExample
            id="3"
            description="The white king ends up on the rook's initial square. he black king doesn't move during castling."
            variants={[GameVariantEnum.CHESS_960]}
            fen="bbr3kr/ppppqppp/2nn4/4p3/4P3/3QNN2/PPPP1PPP/BBR3KR w KQkq - 6 5"
            moves="5. O-O-O O-O"
            symbols={[
              ['g1->c1', 'c1->d1:r'],
              ['g8', 'h8->f8:r'],
            ]}
            gameRef={gameRef}
          />

          <RulesExample
            id="4"
            description="The white rook doesn't move during castling. The black rook ends up on the king's initial square."
            variants={[GameVariantEnum.CHESS_960]}
            fen="bbnrnk1r/pppppqpp/8/5p2/8/3N1N2/PPPPPPPP/BB1R1KQR w KQkq - 2 3"
            moves="3. O-O-O O-O"
            symbols={[
              ['f1->c1', 'd1:r'],
              ['f8->g8', 'h8->f8:r'],
            ]}
            gameRef={gameRef}
          />
        </section>

        <Combinations>
          <p>
            Chess 960 is a neutral variant so it may be combined with almost all variants, except <GameVariantLink variant={GameVariantEnum.CIRCE} />.
            Also in combination with <GameVariantLink variant={GameVariantEnum.HEXAGONAL_CHESS} /> can't be combined with
            {' '}<GameVariantLinks variants={[GameVariantEnum.TWO_FAMILIES, GameVariantEnum.CAPABLANCA, GameVariantEnum.KING_OF_THE_HILL]} />.
          </p>
        </Combinations>
      </React.Fragment>
    );
  }
}
