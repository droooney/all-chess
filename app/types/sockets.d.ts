import {
  ChatMessage,
  ColorEnum,
  Game,
  GameResult,
  Move,
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
    addChatMessage: string;
    newChatMessage: ChatMessage;
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
