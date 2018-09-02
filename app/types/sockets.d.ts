import {
  ColorEnum,
  Game,
  GameResult,
  Move,
  Piece,
  Player,
  Room
} from './game';

declare global {
  interface SocketIOEventWithDataMap {
    roomList: Room[];
    move: Move;
    drawSuggested: {
      from: ColorEnum;
    };
    gameOver: GameResult;
    updateGame: Game;
    initialGameData: {
      player: Player | null;
      game: Game;
    };
    roomCreated: Room;
  }

  type SocketIOEventWithoutDataList = (
    'createRoom'
    | 'drawAccepted'
    | 'drawDeclined'
    | 'resign'
    | 'takeBackRequested'
    | 'takeBackDeclined'
  );
}
