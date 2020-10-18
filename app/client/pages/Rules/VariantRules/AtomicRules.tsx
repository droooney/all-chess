import * as React from 'react';

import { GameVariantEnum } from 'shared/types';

import { Game } from 'client/helpers';

import GameVariantLinks from 'client/components/GameVariantLinks';

import RulesExampleLink from '../RulesExampleLink';
import RulesExample from '../RulesExample';
import Combinations from '../Combinations';
import Combination from '../Combination';
import Overview from '../Overview';
import Moves from '../Moves';
import WinningConditions from '../WinningConditions';

interface OwnProps {
  gameRef(game: Game): void;
}

type Props = OwnProps;

export default class AtomicRules extends React.Component<Props> {
  render() {
    const {
      gameRef,
    } = this.props;

    return (
      <React.Fragment>
        <Overview>
          <p>
            Atomic chess is a variant where any capture causes an explosion of multiple pieces.
          </p>
        </Overview>

        <Moves>
          <p>
            Any non-capturing move is performed the same way as in standard chess. But any capturing move explodes multiple pieces:

            <br />
            <br />

            - the captured piece
            <br />
            - the capturing piece
            <br />
            - any other piece (not pawns) that is located on a neighbor square to the captured piece square (exception is en passant, see below)
          </p>

          <RulesExample
            id="1"
            description="Explosion in atomic chess"
            variants={[GameVariantEnum.ATOMIC]}
            fen="rnbqkb1r/pppppppp/8/1N6/4n3/8/PPPPPPPP/R1BQKBNR w KQkq - 4 3"
            moves="3. Nxc7 Nxd2#"
            symbols={[
              ['b5->c7', 'c7:r', 'c7->b8:r', 'c7->c8:r', 'c7->d8:r'],
              ['e4->d2', 'd2:r', 'd2->c1:r', 'd2->d1:r', 'd2->e1:r'],
            ]}
            gameRef={gameRef}
          />

          <p>
            Any move is legal in Atomic chess if a player doesn't explode their own king.
            That means that there are no checks in Atomic chess so a king may move into &quot;check&quot; and castle through an attacked square.
            But that also means that a king may not capture.
          </p>
        </Moves>

        <section>
          <h3 id="capturing-en-passant">
            Capturing en passant
          </h3>

          <p>
            When a pawn is capturing en passant the explosion center is not the captured pawn square, but the capturing pawn destination square
            {' '}(see <RulesExampleLink id="2" />).
          </p>

          <RulesExample
            id="2"
            description="Capturing en passant"
            variants={[GameVariantEnum.ATOMIC]}
            fen="r1bqkb1r/p1pnpppp/1p1p1n2/3P4/8/2N2N2/PPPBPPPP/R2QKB1R b KQkq - 0 5"
            moves="5... e5 6. dxe6"
            symbols={[
              [],
              ['d5->e6', 'e6:r', 'e6->d7:r', 'e6->f6:r', 'e5:r'],
            ]}
            gameRef={gameRef}
          />
        </section>

        <WinningConditions>
          <p>
            A player wins by exploding the opponent's king, not necessarily directly (see <RulesExampleLink id="1" />).

            <br />
            <br />

            Also because king may move into check there is only one insufficient material draw condition: king(s) vs king(s).
          </p>
        </WinningConditions>

        <Combinations>
          <p>
            Though White has more advantage over Black than in standard chess, Atomic chess combines well with some variants. Exceptions are:
            {' '}<GameVariantLinks variants={[
              GameVariantEnum.ALICE_CHESS, GameVariantEnum.BENEDICT_CHESS, GameVariantEnum.DARK_CHESS,
              GameVariantEnum.ABSORPTION, GameVariantEnum.FRANKFURT,  GameVariantEnum.THREE_CHECK,
              GameVariantEnum.CRAZYHOUSE,
            ]} />.
          </p>

          <Combination variant={GameVariantEnum.ANTICHESS}>
            <p>
              In Atomic + Antichess combination the Antichess insufficient material draw rules are used.
              Also there can be a draw if there are no pieces on the board.
            </p>
          </Combination>

          <Combination variant={GameVariantEnum.HEXAGONAL_CHESS}>
            <p>
              In Atomic + Hexagonal combination the capture explodes 12 squares:
              6 squares around and 6 closest squares of same color (see <RulesExampleLink id="3" />).
            </p>

            <RulesExample
              id="3"
              description="Explosion in Hexagonal chess"
              variants={[GameVariantEnum.ATOMIC, GameVariantEnum.HEXAGONAL_CHESS]}
              fen="b/q1k/2b1n/r2nb1r/ppppppppp/11/5P5/4P1PN3/3P1B1P3/2P2B2P2/1PR1QBKNRP1 w - - 4 3"
              moves="3. Nxg7"
              symbols={[
                [
                  'h4->g7', 'g7:r', 'g7->f8:r', 'g7->g8:r', 'g7->f9:r',
                  'g6:y', 'h6:y', 'f7:y', 'h7:y', 'f8:y', 'g8:y',
                  'h5:y', 'f6:y', 'i6:y', 'e7:y', 'h8:y', 'f9:y',
                ],
              ]}
              gameRef={gameRef}
            />
          </Combination>
        </Combinations>
      </React.Fragment>
    );
  }
}
