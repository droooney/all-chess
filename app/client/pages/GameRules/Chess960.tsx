import * as React from 'react';

import { GameVariantEnum } from 'shared/types';

import GameVariantLink from '../../components/GameVariantLink';

import GameRulesExample from './GameRulesExample';

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

          - the standard one: both the king and the rook's final positions are empty before the castling (<a href="#game-2">example 2</a> - White)
          <br />
          - the king's initial and final position is the same square (<a href="#game-3">example 3</a> - Black)
          <br />
          - the rook's initial and final position is the same square (<a href="#game-4">example 4</a> - White)
          <br />
          - the king's final position is the rook initial position (<a href="#game-3">example 3</a> - White)
          <br />
          - the rook's final position is the king initial position (<a href="#game-4">example 4</a> - Black)
          <br />
          - the king and the rook swap places with each other (<a href="#game-2">example 2</a> - Black)

          <br />
          <br />

          To avoid castling ambiguities, the castling in Chess 960 is performed by first clicking on the king and then on the castling rook.
        </p>

        <GameRulesExample
          id="2"
          description="Example 2. The white king and rook end up on previously empty squares. The black king and rook swap places."
          variants={[GameVariantEnum.CHESS_960]}
          fen="nnrkrqbb/pppppppp/8/8/8/8/PPPPPPPP/NNRKRQBB w KQkq - 0 1"
          moves="1. f4 Nb6 2. Bxb6 axb6 3. Qf3 Nc6 4. O-O O-O-O"
          startingMoveIndex={5}
        />

        <GameRulesExample
          id="3"
          description="Example 3. The white king ends up on the rook's initial square. he black king doesn't move during castling."
          variants={[GameVariantEnum.CHESS_960]}
          fen="bbrnnqkr/pppppppp/8/8/8/8/PPPPPPPP/BBRNNQKR w KQkq - 0 1"
          moves="1. e4 e5 2. Qd3 Nd6 3. Nf3 Nc6 4. Ne3 Qe7 5. O-O-O O-O"
          startingMoveIndex={7}
        />

        <GameRulesExample
          id="4"
          description="Example 4. The white rook doesn't move during castling. The black rook ends up on the king's initial square."
          variants={[GameVariantEnum.CHESS_960]}
          fen="bbnrnkqr/pppppppp/8/8/8/8/PPPPPPPP/BBNRNKQR w KQkq - 0 1"
          moves="1. Ncd3 f5 2. Nf3 Qf7 3. O-O-O O-O"
          startingMoveIndex={3}
        />

        <h2 id="combinations">
          Combinations
        </h2>

        <p>
          Chess 960 is a neutral variant so it may be combined with almost all variants, except <GameVariantLink variant={GameVariantEnum.CIRCE} />.
        </p>
      </React.Fragment>
    );
  }
}
