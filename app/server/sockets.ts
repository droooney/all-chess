import io, { games } from './io';
import {
  pickGameMinimalData
} from './helpers';
import Game from './Game';

const gameList: Game[] = [];
const gameMap: { [gameId: string]: Game } = {};

games.on('connection', (socket) => {
  socket.emit('gameList', gameList.map(pickGameMinimalData));

  socket.on('createGame', (settings) => {
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
