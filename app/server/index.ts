import 'shared/plugins';

import { GameStatusEnum, TimeControlEnum } from 'shared/types';

import { Game as DBGame } from 'server/db/models';

import config from 'server/config';

import server from 'server/server';
import Game from 'server/Game';

import 'server/routes';
import 'server/sockets';

(async () => {
  console.log('Starting');

  console.log('Fetching all ongoing games from database');

  const ongoingGames = await DBGame.findAll({
    where: {
      status: GameStatusEnum.ONGOING,
    },
  });

  console.log('Aborting timer ongoing games and fetching correspondence games players');

  const correspondenceGames: DBGame[] = [];

  await Promise.all(
    ongoingGames.map(async (game) => {
      if (game.timeControl?.type === TimeControlEnum.TIMER) {
        game.status = GameStatusEnum.ABORTED;

        await game.save();
      } else {
        correspondenceGames.push(game);

        await game.getPlayerNames();
      }
    }),
  );

  for (const game of correspondenceGames) {
    Game.games[game.id] = Game.fromDBInstance(game, true);
  }

  console.log('Starting server');

  await new Promise((resolve) => {
    server.listen(config.port, () => {
      resolve(config.port);
    });
  });

  console.log(`Listening on ${config.port}...`);
})();
