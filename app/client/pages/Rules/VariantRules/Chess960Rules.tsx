import * as React from 'react';

import { GameVariantEnum } from 'shared/types';

import { Game } from 'client/helpers';

import GameVariantLink from 'client/components/GameVariantLink';
import GameVariantLinks from 'client/components/GameVariantLinks';

import RulesExample from '../RulesExample';
import Overview from '../Overview';
import Combinations from '../Combinations';
import Setup from '../Setup';
import List from '../List';

interface OwnProps {
  gameRef(game: Game): void;
}

type Props = OwnProps;

export default class Chess960Rules extends React.Component<Props> {
  render() {
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
          </p>

          <List elements={[
            'the bishops are placed on squares of different colors',
            'the king is placed between the rooks',
          ]} />

          <p>
            Then Black's pieces are placed symmetrically.
          </p>

          <RulesExample
            id="1"
            description="Random chess 960 position"
            variants={[GameVariantEnum.CHESS_960]}
          />
        </Setup>

        <section>
          <h2 id="castling">
            Castling
          </h2>

          <p>
            The castling is possible if the following conditions are met:
          </p>

          <List elements={[
            'the king and the castling rook haven\'t moved previously in the game',
            <>
              all the squares between the king's initial and final position
              (including the initial and final squares) are not under attack
              (except when combined with a variant in which there are no checks,
              i.e. <GameVariantLink variant={GameVariantEnum.ATOMIC} /> or
              {' '}<GameVariantLink variant={GameVariantEnum.DARK_CHESS} />)
            </>,
            'all the squares between the king\'s initial position and final position and all the squares'
            + ' between the castling rook\'s initial and final position are empty (with the exception of these two pieces)',
          ]} />

          <p>
            After the castling the king and the rook end up on the same files as in standard chess.
            To avoid castling ambiguities, the castling in Chess 960 is performed by moving the king onto the castling rook.
          </p>
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
