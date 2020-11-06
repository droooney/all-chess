import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import MuiTableCell from '@material-ui/core/TableCell';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import styled from '@material-ui/core/styles/styled';
import map from 'lodash/map';
import React from 'react';

import { PIECES_WORTH } from 'shared/constants';

import { ColorEnum, GameVariantEnum, PieceTypeEnum } from 'shared/types';

import { Game } from 'client/helpers';

import GameVariantLink from 'client/components/GameVariantLink';
import GameVariantLinks from 'client/components/GameVariantLinks';
import Piece from 'client/components/Piece';

import Combination from '../Combination';
import Combinations from '../Combinations';
import GameEnd from '../GameEnd';
import Moves from '../Moves';
import Overview from '../Overview';
import RulesExample from '../RulesExample';

interface OwnProps {
  gameRef(game: Game): void;
}

type Props = OwnProps;

const TableCell = styled(MuiTableCell)({
  padding: '3px 8px',
});
const TableHeaderCell = styled(TableCell)({
  fontWeight: 'bold',
});

class CompensationChess extends React.PureComponent<Props> {
  render() {
    const {
      gameRef,
    } = this.props;

    return (
      <React.Fragment>
        <Overview>
          <p>
            Compensation chess is a variant where any change in material on the board leads to clock change.
            May only be played with clock time control.
          </p>
        </Overview>

        <section>
          <h2>
            Clock
          </h2>

          <p>
            In Compensation chess each piece has a clock equivalent. The more valuable the piece - the more time its value.
            All pieces (except kings) for one player equal to the half of the base clock time. For example, if the time control is 3+0 (180 seconds at the start of the game)
            then all of white's pieces cost 90 seconds (as all of black's pieces). In standard chess all pieces equal to 39 pawns:
            8 pawns + 2 knights (3 pawns each) + 2 bishops (3 pawns each) + 2 rooks (5 pawns each) + a queen (9 pawns). So in case of 3+0
            the pawn value would be 90 / 39 ≈ 2.3 seconds. Knight/bishop would cost ~6.9 seconds, rook – ~11.5 seconds, queen – ~20.8 seconds.
            In other variants the pawn value may be different due to different starting pieces and different piece values.
          </p>

          <p>
            The following table shows piece values (in pawns) that are used to calculate the piece clock value depending on the board type.
          </p>

          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Piece</TableHeaderCell>
                <TableHeaderCell>Standard</TableHeaderCell>
                <TableHeaderCell>Circular</TableHeaderCell>
                <TableHeaderCell>Hexagonal</TableHeaderCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {map(PieceTypeEnum, (pieceType) => (
                <TableRow key={pieceType}>
                  <TableCell style={{ verticalAlign: 'middle' }}>
                    <Piece
                      type={pieceType}
                      color={ColorEnum.WHITE}
                      location={null}
                      width={30}
                    />
                  </TableCell>
                  <TableCell>{PIECES_WORTH.orthodox[pieceType]}</TableCell>
                  <TableCell>{PIECES_WORTH.circular[pieceType]}</TableCell>
                  <TableCell>{PIECES_WORTH.hexagonal[pieceType]}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>

        <Moves>
          <p>
            After the move if there was a change in material on the board (the player captured a piece,
            promoted, exploded pieces, etc) it leads to a change in the player's clock (the one that caused the material change).
            Captured pieces values get subtracted from the player clock, lost pieces values
            (may occur in <GameVariantLinks variants={[GameVariantEnum.ATOMIC, GameVariantEnum.FRANKFURT]} />; also pawns are lost during promotion) get added to the player's clock,
            obtained pieces values (may occur after promotion or in <GameVariantLink variant={GameVariantEnum.FRANKFURT} />) also get subtracted from the player's clock.
          </p>

          <RulesExample
            id="1"
            description="After fxg7 white loses a knight worth of time; after a1=Q black loses a queen worth of time, but gains a pawn worth of time"
            variants={[GameVariantEnum.COMPENSATION_CHESS]}
            fen="8/3k2n1/5P2/8/8/8/p5K1/8 w - - 0 32"
            moves="32. fxg7 a1=Q"
            gameRef={gameRef}
          />
        </Moves>

        <GameEnd>
          <p>
            If a player wins/draws the game on the board and times out on the same move then the result from the board is used.
            However, if a player times out by making a move and the game on the board is not over then they lose.
          </p>
        </GameEnd>

        <Combinations>
          <p>
            Compensation chess can't be combined with <GameVariantLinks variants={[
              GameVariantEnum.ABSORPTION, GameVariantEnum.ANTICHESS, GameVariantEnum.BENEDICT_CHESS,
              GameVariantEnum.CRAZYHOUSE, GameVariantEnum.DARK_CHESS,
            ]} />.
          </p>

          <Combination variant={GameVariantEnum.ATOMIC}>
            <p>
              In Compensation chess + Atomic chess a player gets penalized for each exploded piece.
              On the other hand a player can gain time by exploding their own pieces.
            </p>

            <RulesExample
              id="2"
              description="White loses a knight+pawn worth of time but gains a knight worth of time resulting in only losing a pawn worth of time"
              variants={[GameVariantEnum.COMPENSATION_CHESS, GameVariantEnum.ATOMIC]}
              fen="rnbqkb1r/pppp1ppp/5n2/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3"
              moves="3. Ne5"
              symbols={[
                ['f3->e5', 'e5->f6:r', 'e5:r'],
              ]}
              gameRef={gameRef}
            />
          </Combination>

          <Combination variant={GameVariantEnum.FRANKFURT}>
            <p>
              In Compensation chess + Frankfurt chess a player can further lose/gain time by capturing pieces and changing own pieces.
            </p>

            <RulesExample
              id="3"
              description={
                'After exf6+ white loses 2 knights worth of time for capturing and gaining a knight, but gains a pawn worth of time for losing a pawn;'
                + ' after Qxf6 black loses 2 knights worth of time for the same reason and also gains a queen worth of time for losing a queen'
              }
              variants={[GameVariantEnum.COMPENSATION_CHESS, GameVariantEnum.FRANKFURT]}
              fen="rnbqkb1r/pppp1ppp/4pn2/4P3/8/8/PPPP1PPP/RNBQKBNR w KQkq - 0 3"
              moves="3. exf6+ Qxf6"
              symbols={[
                ['e5->f6'],
                ['d8->f6'],
              ]}
              gameRef={gameRef}
            />
          </Combination>
        </Combinations>
      </React.Fragment>
    );
  }
}

export default CompensationChess;
