import { GameSettings } from '../../types';

export const GAME_DEFAULT_SETTINGS: { [key in keyof GameSettings]: GameSettings[key]; } = {
  showFantomPieces: true,
  timeControl: null
};

export const CIRCULAR_CHESS_EMPTY_CENTER_RATIO = 1 / 3;

export const STANDARD_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
