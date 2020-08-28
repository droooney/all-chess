import { Game as DBGame } from 'server/db/models';

import Game from 'server/Game';

const games: Game[] = [];

export async function up() {
  await DBGame.bulkCreate(
    games.map((game) => game.toDBInstance()),
  );
}

export async function down() {
  await DBGame.truncate();
}
