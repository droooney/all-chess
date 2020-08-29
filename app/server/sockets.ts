import forEach from 'lodash/forEach';
import pick from 'lodash/pick';

import { DEFAULT_RATING } from 'shared/constants';

import {
  Challenge,
  ColorEnum,
  Dictionary,
  GameStatusEnum,
  Player,
  User,
} from 'shared/types';

import { sessionMiddleware } from 'server/controllers/session';

import { User as DBUser } from 'server/db/models';

import Game from 'server/Game';
import { games } from 'server/io';

const challenges: Dictionary<Challenge> = {};
const challengeCreators: Dictionary<number> = {};

// TODO: remove challenges after some time

games.use(async (socket, next) => {
  try {
    await sessionMiddleware(socket.request, socket.request.res);
  } catch (err) {
    return next(err);
  }

  next();
});

games.on('connection', (socket) => {
  socket.on('disconnect', () => {
    const user: User | undefined = socket.request.session?.user;

    if (user) {
      const canceledChallengeIds: string[] = [];

      forEach(challengeCreators, (userId, challengeId) => {
        if (user.id === userId) {
          delete challenges[challengeId];
          delete challengeCreators[challengeId];

          canceledChallengeIds.push(challengeId);
        }
      });

      games.emit('challengesCanceled', canceledChallengeIds);
    }
  });

  socket.emit('challengeList', challenges);

  socket.on('createChallenge', async (settings) => {
    const user: User | undefined = socket.request.session?.user;

    if (!user || !Game.validateSettings(settings)) {
      return;
    }

    const variantType = Game.getVariantType(settings.variants);
    const speedType = Game.getSpeedType(settings.timeControl);
    const challengeId = Game.generateUid(challenges);
    const challenge: Challenge = {
      ...settings,
      id: challengeId,
      challenger: {
        id: user.id,
        login: user.login,
        rating: (user.ratings[variantType]?.[speedType] || DEFAULT_RATING).r,
        color: settings.color || null,
      },
    };

    challenges[challengeId] = challenge;
    challengeCreators[challengeId] = user.id;

    games.emit('newChallenge', challenge);
  });

  socket.on('acceptChallenge', async (challengeId) => {
    const challenge = challenges[challengeId];
    const user: User | undefined = socket.request.session?.user;

    if (!user || !challenge) {
      return;
    }

    const [challenger, accepting] = await Promise.all([
      DBUser.findByPk(challenge.challenger.id),
      DBUser.findByPk(user.id),
    ]);

    if (!challenger || !accepting) {
      return;
    }

    // TODO: remove challenges by challenger and accepting

    const variantType = Game.getVariantType(challenge.variants);
    const speedType = Game.getSpeedType(challenge.timeControl);
    const challengerColor: ColorEnum.WHITE | ColorEnum.BLACK = challenge.challenger.color || (
      Math.random() > 0.5
        ? ColorEnum.WHITE
        : ColorEnum.BLACK
    );
    const acceptingColor = Game.getOppositeColor(challengerColor);
    const challengingPlayer: Player = {
      id: challenger.id,
      name: challenger.login,
      color: challengerColor,
      rating: (challenger.ratings[variantType]?.[speedType] || DEFAULT_RATING).r,
      newRating: null,
      time: challenge.timeControl && challenge.timeControl.base,
    };
    const acceptingPlayer: Player = {
      id: accepting.id,
      name: accepting.login,
      color: acceptingColor,
      rating: (accepting.ratings[variantType]?.[speedType] || DEFAULT_RATING).r,
      newRating: null,
      time: challenge.timeControl && challenge.timeControl.base,
    };
    let game: Game;

    while (true) {
      try {
        game = new Game({
          ...pick(challenge, ['startingFen', 'rated', 'timeControl']),
          variants: [...challenge.variants].sort(),
          id: Game.generateUid({}),
          status: GameStatusEnum.ONGOING,
          pgnTags: {},
          startingData: null,
          isLive: true,
        });

        game.players[challengerColor] = challengingPlayer;
        game.players[acceptingColor] = acceptingPlayer;

        if (game.is960 && !game.startingFen) {
          game.startingFen = game.getFen();
        }

        await game.toDBInstance().save();

        break;
      } catch {}
    }

    delete challenges[challengeId];
    delete challengeCreators[challengeId];

    games.emit('challengeAccepted', {
      challengeId,
      gameId: game.id,
      acceptingUserId: accepting.id,
    });
  });

  socket.on('cancelChallenge', (challengeId) => {
    const challenge = challenges[challengeId];
    const user: User | undefined = socket.request.session?.user;

    if (!challenge || !user || challenge.challenger.id !== user.id) {
      return;
    }

    delete challenges[challengeId];
    delete challengeCreators[challengeId];

    games.emit('challengesCanceled', [challengeId]);
  });
});
