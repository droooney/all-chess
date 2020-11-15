// TODO: needs testing, add more logging

import { Op } from 'sequelize';

import { DEFAULT_RATING } from 'shared/constants';

import { GameVariantEnum } from 'shared/types';

import { Game as DBGame, User } from 'server/db/models';

import Game from 'server/Game';

(async () => {
  const games = await DBGame.findAll({
    where: {
      variants: {
        [Op.contains]: [GameVariantEnum.HEXAGONAL_CHESS, GameVariantEnum.FRANKFURT],
      },
    },
  });

  for (const game of games) {
    if (!game) {
      continue;
    }

    console.log(`Destroying game ${game.id}`);

    if (!game.rated) {
      console.log('Not rated, destroying');

      await game.destroy();

      continue;
    }

    console.log('Fetching players');

    const [whitePlayer, blackPlayer] = await Promise.all([
      User.findByPk(game.whitePlayer.id),
      User.findByPk(game.blackPlayer.id),
    ]);

    if (!whitePlayer || !blackPlayer) {
      throw new Error(`Player not found (${whitePlayer ? game.blackPlayer.id : game.whitePlayer.id})`);
    }

    if (game.whitePlayer.newRating === null || game.blackPlayer.newRating === null) {
      throw new Error(`Player doesn't have new rating (${
        game.whitePlayer.newRating === null ? game.whitePlayer.id : game.blackPlayer.id
      })`);
    }

    const variantType = Game.getVariantType(game.variants);
    const speedType = Game.getSpeedType(game.timeControl);

    whitePlayer.ratings = {
      ...whitePlayer.ratings,
      [variantType]: {
        ...whitePlayer.ratings[variantType],
        [speedType]: (
          (whitePlayer.ratings[variantType]?.[speedType] || DEFAULT_RATING).r
          + game.whitePlayer.rating
          - game.whitePlayer.newRating
        ),
      },
    };
    blackPlayer.ratings = {
      ...blackPlayer.ratings,
      [variantType]: {
        ...blackPlayer.ratings[variantType],
        [speedType]: (
          (blackPlayer.ratings[variantType]?.[speedType] || DEFAULT_RATING).r
          + game.blackPlayer.rating
          - game.blackPlayer.newRating
        ),
      },
    };

    console.log('Compensating player ratings, destroying game');

    await Promise.all([
      whitePlayer.save(),
      blackPlayer.save(),
      game.destroy(),
    ]);
  }

  process.exit(0);
})().catch((err) => {
  console.log(err);

  process.exit(1);
});
