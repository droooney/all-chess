import * as React from 'react';

import { GameVariantEnum } from '../../../types';
import { GAME_VARIANT_NAMES } from '../../../shared/constants';

import GameRulesExample from '../GameRulesExample';
import GameVariantLink from '../GameVariantLink';

export default class Chess960GameRules extends React.Component {
  render() {
    return (
      <React.Fragment>

        <h2 id="overview">
          Overview
        </h2>

        <p>
          Chess 960 is a chess variant where the pieces setup is picked randomly from 960 possible positions.
        </p>

        <h2 id="setup">
          Setup
        </h2>

        <p>
          White&apos;s pieces are placed according to the following rules:

          <br />
          <br />

          - the bishops are placed on squares of the different colors
          <br />
          - the king is placed between the rooks
          <br />
          <br />
          Then Black&apos;s pieces are placed symmetrically.
        </p>

        <GameRulesExample
          id="1"
          description="Example 1. Random chess 960 position"
          variants={[GameVariantEnum.CHESS_960]}
          fen="nnbrqbkr/pppppppp/8/8/8/8/PPPPPPPP/NNBRQBKR w KQkq - 0 1"
        />

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
          - the king and the castling rook haven&apos;t moved previously in the game
          <br />
          - all the squares between the king&apos;s initial and final position
          (including the initial and final squares) are not under attack
          (except when combined with a variant in which there are no checks, i.e. <GameVariantLink variant={GameVariantEnum.ATOMIC} />,
          {' '}<GameVariantLink variant={GameVariantEnum.MONSTER_CHESS} /> or <GameVariantLink variant={GameVariantEnum.DARK_CHESS} />)
          <br />
          - all the squares between the king&apos;s initial position and final position
          and all the squares between the castling rook&apos;s initial and final position are empty (with the exception of these two pieces)

          <br />
          <br />

          Basically there are six types of castling:

          <br />
          <br />

          - the standard one: both the king and the rook&apos;s final positions are empty before the castling (<a href="#example-2">example 2</a> - White)
          <br />
          - the king&apos;s initial and final position is the same square (<a href="#example-3">example 3</a> - Black)
          <br />
          - the rook&apos;s initial and final position is the same square (<a href="#example-4">example 4</a> - White)
          <br />
          - the king&apos;s final position is the rook initial position (<a href="#example-3">example 3</a> - White)
          <br />
          - the rook&apos;s final position is the king initial position (<a href="#example-4">example 4</a> - Black)
          <br />
          - the king and the rook swap places with each other (<a href="#example-2">example 2</a> - Black)

          <br />
          <br />

          To avoid castling ambiguities, the castling in Chess 960 is performed by first clicking on the king and then on the castling rook.
        </p>

        <GameRulesExample
          id="2"
          description={
            <React.Fragment>
              Example 2. The white king and rook
              <br />
              end up on previously empty squares.
              <br />
              The black king and rook swap places.
            </React.Fragment>
          }
          variants={[GameVariantEnum.CHESS_960]}
          fen="nnrkrqbb/pppppppp/8/8/8/8/PPPPPPPP/NNRKRQBB w KQkq - 0 1"
          moves="1. f4 Nb6 2. Bxb6 axb6 3. Qf3 Nc6 4. O-O O-O-O"
          startingMoveIndex={5}
        />

        <GameRulesExample
          id="3"
          description={
            <React.Fragment>
              Example 3. The white king ends up on
              <br />
              the rook&apos;s initial square.
              <br />
              The black king doesn&apos;t move during castling.
            </React.Fragment>
          }
          variants={[GameVariantEnum.CHESS_960]}
          fen="bbrnnqkr/pppppppp/8/8/8/8/PPPPPPPP/BBRNNQKR w KQkq - 0 1"
          moves="1. e4 e5 2. Qd3 Nd6 3. Nf3 Nc6 4. Ne3 Qe7 5. O-O-O O-O"
          startingMoveIndex={7}
        />

        <GameRulesExample
          id="4"
          description={
            <React.Fragment>
              Example 4. The white rook doesn&apos;t
              <br />
              move during castling.
              <br />
              The black rook ends up on the
              <br />
              king&apos;s initial square.
            </React.Fragment>
          }
          variants={[GameVariantEnum.CHESS_960]}
          fen="bbnrnkqr/pppppppp/8/8/8/8/PPPPPPPP/BBNRNKQR w KQkq - 0 1"
          moves="1. Ncd3 f5 2. Nf3 Qf7 3. O-O-O O-O"
          startingMoveIndex={3}
        />

        <h2 id="combinations">
          Combinations
        </h2>

        <p>
          Chess 960 is a pretty neutral variant so it may be combined with almost all variants, except
          {' '}<GameVariantLink variant={GameVariantEnum.CHESSENCE} />.
        </p>

        <h3 id="combinations-circe">
          {GAME_VARIANT_NAMES[GameVariantEnum.CIRCE]}
        </h3>

        <p>
          When played in combination with <GameVariantLink variant={GameVariantEnum.CIRCE} />, there is an exception to the usual Circe game:
          when captured, the pieces don&apos;t return to their initial squares, but rather to the starting squares of the same game but without Chess 960.
        </p>

        <GameRulesExample
          id="5"
          description={
            <React.Fragment>
              Example 5. The white queen captures the
              <br />
              black queen, it returns to the &quot;initial&quot; square.
              <br />
              The black rook captures the white queen, but
              <br />
              its &quot;initial&quot; square is occupied by the bishop,
              <br />
              so the queen remains captured.
            </React.Fragment>
          }
          variants={[GameVariantEnum.CHESS_960, GameVariantEnum.CIRCE]}
          fen="bnr1kqrn/ppppb2p/5pp1/4P3/4P3/6P1/PPPP3P/BNRBKQRN b KQkq - 1 7"
          moves="7... fxe5 8. Qxf8+ Rxf8"
          startingMoveIndex={0}
        />

      </React.Fragment>
    );
  }
}
