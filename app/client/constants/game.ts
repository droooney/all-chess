import { GameSettings } from '../../types';

export const GAME_DEFAULT_SETTINGS: { [key in keyof GameSettings]: GameSettings[key]; } = {
  showFantomPieces: true,
  timeControl: null
};

export const CIRCULAR_CHESS_EMPTY_CENTER_RATIO = 1 / 3;
