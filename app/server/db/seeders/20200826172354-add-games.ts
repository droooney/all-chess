import { ColorEnum } from 'shared/types';

import { Game as DBGame, User } from 'server/db/models';

import Game from 'server/Game';

const games: Game[] = [
  Game.getGameFromPgn('', 'standard'),
];

export async function up() {
  const [user1, user2] = await User.findAll();

  await Promise.all(
    games.map((game) => {
      game.players = {
        [ColorEnum.WHITE]: game.getPlayerFromUser(user1, ColorEnum.WHITE),
        [ColorEnum.BLACK]: game.getPlayerFromUser(user2, ColorEnum.BLACK),
      };

      return game.toDBInstance().save();
    }),
  );
}

export async function down() {
  await DBGame.truncate();
}
