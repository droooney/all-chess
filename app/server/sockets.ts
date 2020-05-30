import io, { games } from './io';
import {
  pickGameMinimalData
} from './helpers';
import { Dictionary } from '../types';
import { sessionMiddleware } from './controllers/session';
import Game from './Game';

const gameList: Game[] = [];
const gameMap: Dictionary<Game> = {};

games.use(async (socket, next) => {
  try {
    await sessionMiddleware(socket.request, socket.request.res);
  } catch (err) {
    return next(err);
  }

  next();
});

games.on('connection', (socket) => {
  socket.emit('gameList', gameList.map(pickGameMinimalData));

  socket.on('createGame', (settings) => {
    if (!socket.request.session || !socket.request.session.user) {
      return;
    }

    if (!Game.validateSettings(settings)) {
      return;
    }

    const id = Game.generateUid(gameMap);
    const gameNamespace = io.of(`/games/${id}`);
    const game = new Game(gameNamespace, {
      ...settings,
      id
    });

    gameList.push(game);
    gameMap[id] = game;

    games.emit('gameCreated', pickGameMinimalData(game));
  });
});
