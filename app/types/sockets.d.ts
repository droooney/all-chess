import {
  BaseMove,
  ChatMessage,
  ColorEnum,
  Game,
  GameCreateSettings,
  GamePlayers,
  GameResult,
  Move,
  Player
} from './game';

declare global {
  interface SocketIOEventWithDataMap {
    gameList: Game[];
    makeMove: BaseMove;
    moveMade: Move;
    drawOffered: ColorEnum;
    gameOver: GameResult;
    startGame: GamePlayers;
    updatePlayers: GamePlayers;
    initialGameData: {
      timestamp: number;
      player: Player | null;
      game: Game;
    };
    createGame: GameCreateSettings;
    gameCreated: Game;
    addChatMessage: string;
    newChatMessage: ChatMessage;
  }

  type SocketIOEventWithoutDataList = (
    'drawAccepted'
    | 'drawDeclined'
    | 'resign'
    | 'takebackRequested'
    | 'takebackAccepted'
    | 'takebackDeclined'
  );
}
