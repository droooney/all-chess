import {
  GameSettings,
  ShortUser
} from '../../types';

export interface CommonState {
  isMobile: boolean;
  isTouchDevice: boolean;
  scrollSize: number;
}

export type UserState = ShortUser | null;

export type GameSettingsState = GameSettings;

export interface ReduxState {
  common: CommonState;
  gameSettings: GameSettingsState;
  user: UserState;
}
