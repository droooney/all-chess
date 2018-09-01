import {
  ColorEnum,
  Game,
  Move,
  Room
} from './game';

declare global {
  interface SocketIOEventWithDataMap {
    roomList: Room[];
    move: Move;
    drawSuggested: {
      from: ColorEnum;
    };
    gameOver: {
      winner: ColorEnum | null;
    };
    updateGame: Game;
  }

  type SocketIOEventWithoutDataList = (
    'newRoom'
    | 'drawDeclined'
    | 'resign'
  );
}
