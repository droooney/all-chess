import React from 'react';

import { GameVariantEnum } from 'shared/types';

import { Game } from 'client/helpers';

import GameVariantLinks from 'client/components/GameVariantLinks';

import Combination from '../Combination';
import Combinations from '../Combinations';
import GameEnd from '../GameEnd';
import Overview from '../Overview';
import Pieces from '../Pieces';
import RulesExample from '../RulesExample';
import RulesExampleLink from '../RulesExampleLink';

interface OwnProps {
  gameRef(game: Game): void;
}

type Props = OwnProps;

class AntichessRules extends React.PureComponent<Props> {
  render() {
    const {
      gameRef,
    } = this.props;

    return (
      <React.Fragment>
        <Overview>
          <p>
            Antichess is a variant in which a player wins by losing all pieces or stalemating themselves.
          </p>
        </Overview>

        <Pieces>
          <p>
            King is not a royal piece in Antichess and can be captured as any piece.
            Also you can promote to a king.
          </p>

          <RulesExample
            id="1"
            description="White captures the king on e6; Black promotes to a new king"
            variants={[GameVariantEnum.ANTICHESS]}
            fen="8/8/4k3/8/8/8/4R1p1/8 w - - 0 27"
            moves="27. Rxe6 g1=K"
            gameRef={gameRef}
          />
        </Pieces>

        <GameEnd>
          <p>
            Game ends when one side can't make a move: no pieces left (<RulesExampleLink id="2" />)
            or no piece can make a move (stalemate, <RulesExampleLink id="3" />). In this case this side wins.
          </p>

          <RulesExample
            id="2"
            description="White wins after fxg6 - no pieces left"
            variants={[GameVariantEnum.ANTICHESS]}
            fen="r7/1p1k1pp1/p5P1/7p/8/8/8/8 b - - 0 26"
            moves="26... fxg6#"
            gameRef={gameRef}
          />

          <RulesExample
            id="3"
            description="Black wins after Qxf6 - stalemate, no black piece can make a move"
            variants={[GameVariantEnum.ANTICHESS]}
            fen="8/8/5k2/5R2/p7/P5p1/1PK3P1/8 w - - 0 24"
            moves="24. Rxf6#"
            gameRef={gameRef}
          />
        </GameEnd>

        <Combinations>
          <p>
            Antichess can't be combined with many variants: <GameVariantLinks variants={[
              GameVariantEnum.ABSORPTION, GameVariantEnum.BENEDICT_CHESS, GameVariantEnum.CIRCE,
              GameVariantEnum.CRAZYHOUSE, GameVariantEnum.COMPENSATION_CHESS, GameVariantEnum.KING_OF_THE_HILL,
              GameVariantEnum.MADRASI, GameVariantEnum.PATROL, GameVariantEnum.THREE_CHECK,
            ]} />.
          </p>

          <Combination variant={GameVariantEnum.ATOMIC}>
            <p>
              In Antichess + Atomic there can be also a draw if there are no pieces left on the board.
            </p>

            <RulesExample
              id="4"
              description="White explodes black bishop along with their own - draw"
              variants={[GameVariantEnum.ANTICHESS, GameVariantEnum.ATOMIC]}
              fen="8/8/5b2/8/8/2B5/8/8 w - - 0 25"
              moves="25. Bxf6"
              symbols={[
                ['c3->f6'],
              ]}
              gameRef={gameRef}
            />
          </Combination>
        </Combinations>
      </React.Fragment>
    );
  }
}

export default AntichessRules;
