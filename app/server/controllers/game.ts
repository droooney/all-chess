import { CustomContext } from 'server/types';

import { Game as DBGame } from 'server/db/models';

import Game from 'server/Game';

export async function getGame(ctx: CustomContext) {
  const {
    state: {
      urlKeyGroups,
    },
  } = ctx;
  const game = await DBGame.findByPk(urlKeyGroups?.gameId || '');

  await game?.getPlayers();

  ctx.body = {
    success: true,
    game: game && Game.fromDBInstance(game, false),
  };
}
