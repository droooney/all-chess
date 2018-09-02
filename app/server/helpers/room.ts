import { Room } from '../../types';

export function generateRoomId(roomMap: { [roomId: string]: Room }): string {
  let roomId: string;

  do {
    roomId = Math.random().toString(36).slice(2);
  } while (roomMap[roomId]);

  return roomId;
}
