import React from 'react';

import { GameVariantEnum } from 'shared/types';

import { Game } from 'client/helpers';

import GameVariantLinks from 'client/components/GameVariantLinks';

import CombinationLinkSection from '../CombinationLinkSection';
import Combinations from '../Combinations';
import Moves from '../Moves';
import Overview from '../Overview';
import RulesExample from '../RulesExample';
import SpecialRules from '../SpecialRules';

interface OwnProps {
  gameRef(game: Game): void;
}

type Props = OwnProps;

class CrazyhouseRules extends React.PureComponent<Props> {
  render() {
    const {
      gameRef,
    } = this.props;

    return (
      <React.Fragment>
        <Overview>
          <p>
            Crazyhouse is a variant in which captured pieces go to the player's pocket
            and can be put back on the board later in the game.
          </p>
        </Overview>

        <Moves>
          <p>
            If a player captures a piece, the piece changes color and is put in the player's pocket.
            Later in the game instead of the moving a piece on the board the player can "drop" this piece
            back on the board. Pawns can be dropped on any empty square except the first and the last ranks, the rest
            of the pieces can be dropped on any empty square.
          </p>

          <p>
            If a pawn promotes to a piece and later this piece is captured it goes to the player's pocket as a pawn.
            Such pieces are indicated by a pawn symbol in the corner.
          </p>

          <RulesExample
            id="1"
            description="White captures the black pawn - it goes to the player's pocket; Black does the same; White drops the pawn back on the board"
            variants={[GameVariantEnum.CRAZYHOUSE]}
            fen="rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR/ w KQkq d6 2 2"
            moves="2. exd5 Qxd5 3. P@c4"
            gameRef={gameRef}
          />
        </Moves>

        <SpecialRules>
          <p>
            In Crazyhouse the 50-move rule is not in effect, as any pawn move (even promotion) or capture
            is indirectly reversible.
          </p>
        </SpecialRules>

        <Combinations>
          <p>
            Crazyhouse can't be combined with <GameVariantLinks variants={[
              GameVariantEnum.ABSORPTION, GameVariantEnum.ANTICHESS, GameVariantEnum.ATOMIC,
              GameVariantEnum.BENEDICT_CHESS, GameVariantEnum.COMPENSATION_CHESS, GameVariantEnum.FRANKFURT,
            ]} />.
          </p>

          <CombinationLinkSection
            from={GameVariantEnum.CRAZYHOUSE}
            to={GameVariantEnum.CIRCE}
          />
        </Combinations>
      </React.Fragment>
    );
  }
}

export default CrazyhouseRules;
