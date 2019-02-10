import {
  BaseMove,
  ChatMessage,
  ColorEnum,
  DarkChessGameInitialData,
  DarkChessMove,
  GameCreateSettings,
  GameInitialData,
  GameMinimalData,
  GamePlayers,
  GameResult,
  Move,
  TakebackRequest
} from './game';

declare global {
  interface SocketIOEventWithDataMap {
    gameList: GameMinimalData[];
    makeMove: BaseMove;
    moveMade: {
      move: Move;
      lastMoveTimestamp: number;
    };
    darkChessMoveMade: {
      move: DarkChessMove;
      lastMoveTimestamp: number;
    };
    drawOffered: ColorEnum;
    gameOver: GameResult;
    darkChessMoves: Move[];
    startGame: GamePlayers;
    updatePlayers: GamePlayers;
    initialGameData: GameInitialData;
    initialDarkChessGameData: DarkChessGameInitialData;
    createGame: GameCreateSettings;
    gameCreated: GameMinimalData;
    addChatMessage: string;
    newChatMessage: ChatMessage;
    requestTakeback: number;
    takebackRequested: TakebackRequest;
    takebackAccepted: number;
  }

  type SocketIOEventWithoutDataList = (
    'drawAccepted'
    | 'drawDeclined'
    | 'drawCanceled'
    | 'offerDraw'
    | 'resign'
    | 'takebackDeclined'
    | 'takebackCanceled'
  );
}
