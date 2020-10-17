import * as React from 'react';

import { GAME_VARIANT_NAMES } from 'shared/constants';

import { GameVariantEnum } from 'shared/types';

import { Game } from 'client/helpers';

import GameVariantLink from '../../components/GameVariantLink';

import RulesExample from './RulesExample';

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

        <h2 id="overview">
          Overview
        </h2>

        <p>
          Atomic chess is a chess variant where any capture causes an explosion of multiple pieces.
        </p>

        <h3 id="winning-conditions">
          Moves
        </h3>

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
          description="Example 1. Explosion in atomic chess"
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

        <h4 id="capturing-en-passant">
          Capturing en passant
        </h4>

        <p>
          When a pawn is capturing en passant the explosion center is not the captured pawn square, but the capturing pawn destination square
          {' '}(see <a href="#game-2">example 2</a>).
        </p>

        <RulesExample
          id="2"
          description="Example 2. Capturing en passant"
          variants={[GameVariantEnum.ATOMIC]}
          fen="r1bqkb1r/p1pnpppp/1p1p1n2/3P4/8/2N2N2/PPPBPPPP/R2QKB1R b KQkq - 0 5"
          moves="5... e5 6. dxe6"
          symbols={[
            null,
            ['d5->e6', 'e6:r', 'e6->d7:r', 'e6->f6:r', 'e5:r'],
          ]}
          gameRef={gameRef}
        />

        <h3 id="winning-conditions">
          Winning conditions
        </h3>

        <p>
          A player wins by exploding the opponent's king, not necessarily directly (see <a href="#game-1">example 1</a>).

          <br />
          <br />

          Also because king may move into check there is only one insufficient material draw condition: king(s) vs king(s).
        </p>

        <h2 id="combinations">
          Combinations
        </h2>

        <p>
          Though White has more advantage over Black than in standard chess, Atomic chess combines well with some variants. Exceptions are:
          {' '}<GameVariantLink variant={GameVariantEnum.ALICE_CHESS} />, <GameVariantLink variant={GameVariantEnum.BENEDICT_CHESS} />,
          {' '}<GameVariantLink variant={GameVariantEnum.DARK_CHESS} />, <GameVariantLink variant={GameVariantEnum.ABSORPTION} />,
          {' '}<GameVariantLink variant={GameVariantEnum.FRANKFURT} />, <GameVariantLink variant={GameVariantEnum.HEXAGONAL_CHESS} />,
          {' '}<GameVariantLink variant={GameVariantEnum.THREE_CHECK} />, <GameVariantLink variant={GameVariantEnum.CRAZYHOUSE} />.
        </p>

        <h3 id="combinations-antichess">
          {GAME_VARIANT_NAMES[GameVariantEnum.ANTICHESS]}
        </h3>

        <p>
          In Atomic + Antichess combination the Antichess insufficient material draw rules are used.
          Also there can be a draw if there are no pieces on the board.
        </p>

      </React.Fragment>
    );
  }
}
