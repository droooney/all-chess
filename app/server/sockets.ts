import io from './io';
import { Player, Room } from '../types';
import { generateRoomId } from './helpers';
import Game from './Game';

const roomList: Room[] = [];
const roomMap: { [roomId: string]: Room } = {};
const gameMap: { [roomId: string]: Game } = {};

io.of('/rooms').on('connection', (socket) => {
  socket.emit('roomList', roomList);

  socket.on('newRoom', () => {
    const roomId = generateRoomId(roomMap);
    const players: Player[] = [];
    const room = {
      id: roomId,
      players
    };

    roomList.push(room);
    roomMap[roomId] = room;
    gameMap[roomId] = new Game(io.of(`/rooms/${roomId}`), players);
  });
});
