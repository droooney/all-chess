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
  Move
} from './game';

declare global {
  interface SocketIOEventWithDataMap {
    gameList: GameMinimalData[];
    makeMove: BaseMove;
    moveMade: Move;
    darkChessMoveMade: DarkChessMove;
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
  }

  type SocketIOEventWithoutDataList = (
    'drawAccepted'
    | 'drawDeclined'
    | 'drawCanceled'
    | 'offerDraw'
    | 'resign'
    | 'takebackRequested'
    | 'takebackAccepted'
    | 'takebackDeclined'
    | 'declareThreefoldRepetitionDraw'
    | 'declare50MoveDraw'
  );
}
