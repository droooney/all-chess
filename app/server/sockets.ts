import io, { games } from './io';
import { generateGameId } from './helpers';
import { socketAuth } from './controllers/session';
import Game from './Game';

const gameList: Game[] = [];
const gameMap: { [gameId: string]: Game } = {};

games.on('connection', (socket) => {
  socket.emit('gameList', gameList);

  socket.on('createGame', (settings) => {
    if (!Game.validateSettings(settings)) {
      return;
    }

    const id = generateGameId(gameMap);
    const gameNamespace = io.of(`/games/${id}`);
    const game = new Game(gameNamespace, {
      ...settings,
      id
    });

    gameNamespace.use(socketAuth);

    gameList.push(game);
    gameMap[id] = game;

    games.emit('gameCreated', game);
  });
});
