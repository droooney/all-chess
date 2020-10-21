import forEach from 'lodash/forEach';

import { DEFAULT_RATING } from 'shared/constants';

import {
  Challenge,
  Dictionary,
  User,
} from 'shared/types';

import { sessionMiddleware } from 'server/controllers/session';

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

    // TODO: remove challenges by challenger and accepting

    const game = await Game.createGameFromChallenge(challenge, user.id);

    if (!game) {
      return;
    }

    delete challenges[challengeId];
    delete challengeCreators[challengeId];

    games.emit('challengeAccepted', {
      challengeId,
      gameId: game.id,
      acceptingUserId: user.id,
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

  socket.emit('challengeList', challenges);
});
