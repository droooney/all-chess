/// <reference path="../typings/socket.io.d.ts" />

import { Dictionary } from 'shared/types/common';

import {
  BaseMove,
  Challenge,
  ChatMessage,
  ColorEnum,
  DarkChessGameInitialData,
  DarkChessMove,
  GameCreateSettings,
  GameInitialData,
  GamePlayers,
  GameResult,
  Move,
  Player,
  TakebackRequest,
} from './game';

declare global {
  interface SocketIOServerEventWithDataMap {
    gamePing: number;
    challengeList: Dictionary<Challenge>;
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
    updatePlayers: GamePlayers;
    initialGameData: GameInitialData;
    initialDarkChessGameData: DarkChessGameInitialData;
    newChallenge: Challenge;
    challengeAccepted: {
      challengeId: string;
      gameId: string;
      acceptingUserId: number;
    };
    challengesCanceled: string[];
    newChatMessage: ChatMessage;
    takebackRequested: TakebackRequest;
    takebackAccepted: number;
    rematchOffered: ColorEnum;
    rematchAccepted: string;
  }

  type SocketIOServerEventWithoutDataList = (
    'drawDeclined'
    | 'drawCanceled'
    | 'takebackDeclined'
    | 'takebackCanceled'
    | 'rematchDeclined'
    | 'rematchCanceled'
    | 'rematchNotAllowed'
  );

  interface SocketIOClientEventWithDataMap {
    gamePong: number;
    makeMove: BaseMove;
    createChallenge: GameCreateSettings;
    addChatMessage: string;
    acceptChallenge: string;
    cancelChallenge: string;
  }

  type SocketIOClientEventWithoutDataList = (
    'acceptDraw'
    | 'declineDraw'
    | 'cancelDraw'
    | 'offerDraw'
    | 'resign'
    | 'requestTakeback'
    | 'acceptTakeback'
    | 'declineTakeback'
    | 'cancelTakeback'
    | 'offerRematch'
    | 'acceptRematch'
    | 'declineRematch'
    | 'cancelRematch'
  );
}

declare module 'socket.io' {
  interface Socket {
    pingResponded: Set<number>;
    player: Player | null;
  }
}
