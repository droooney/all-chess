import { PublicUser } from 'shared/types';
import { GameSettings } from 'client/types';

export interface CommonState {
  isMobile: boolean;
  isTouchDevice: boolean;
  scrollSize: number;
}

export type UserState = PublicUser | null;

export type GameSettingsState = GameSettings;

export interface ReduxState {
  common: CommonState;
  gameSettings: GameSettingsState;
  user: UserState;
}
