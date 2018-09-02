import io, { rooms } from './io';
import { Player, Room } from '../types';
import { generateRoomId } from './helpers';
import { socketAuth } from './controllers/session';
import Game from './Game';

const roomList: Room[] = [];
const roomMap: { [roomId: string]: Room } = {};
const gameMap: { [roomId: string]: Game } = {};

rooms.on('connection', (socket) => {
  socket.emit('roomList', roomList);

  socket.on('createRoom', () => {
    const roomId = generateRoomId(roomMap);
    const players: Player[] = [];
    const room = {
      id: roomId,
      players
    };
    const gameNamespace = io.of(`/rooms/${roomId}`);

    gameNamespace.use(socketAuth);

    roomList.push(room);
    roomMap[roomId] = room;
    gameMap[roomId] = new Game(gameNamespace, players);

    rooms.emit('roomCreated', room);
  });
});
