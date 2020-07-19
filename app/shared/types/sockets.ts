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
  TakebackRequest,
} from './game';

declare global {
  interface SocketIOServerEventWithDataMap {
    gamePing: number;
    gameList: GameMinimalData[];
    moveMade: {
      move: Move | DarkChessMove;
      moveIndex: number;
      lastMoveTimestamp: number;
    };
    drawOffered: ColorEnum;
    gameOver: {
      result: GameResult;
      players: GamePlayers;
    };
    darkChessMoves: Move[];
    startGame: GamePlayers;
    updatePlayers: GamePlayers;
    initialGameData: GameInitialData;
    initialDarkChessGameData: DarkChessGameInitialData;
    gameCreated: GameMinimalData;
    newChatMessage: ChatMessage;
    takebackRequested: TakebackRequest;
    takebackAccepted: number;
  }

  type SocketIOServerEventWithoutDataList = (
    'drawDeclined'
    | 'drawCanceled'
    | 'takebackDeclined'
    | 'takebackCanceled'
  );

  interface SocketIOClientEventWithDataMap {
    gamePong: number;
    makeMove: BaseMove;
    createGame: GameCreateSettings;
    addChatMessage: string;
    requestTakeback: number;
  }

  type SocketIOClientEventWithoutDataList = (
    'acceptDraw'
    | 'declineDraw'
    | 'cancelDraw'
    | 'offerDraw'
    | 'resign'
    | 'acceptTakeback'
    | 'declineTakeback'
    | 'cancelTakeback'
  );
}
