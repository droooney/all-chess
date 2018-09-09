import {
  ChatMessage,
  ColorEnum,
  Game,
  GamePlayers,
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
    startGame: GamePlayers;
    updatePlayers: GamePlayers;
    initialGameData: {
      timestamp: number;
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
