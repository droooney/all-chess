import {
  GameSettings,
  ShortUser
} from '../../types';

export type UserState = ShortUser | null;

export type GameSettingsState = GameSettings;

export interface ReduxState {
  gameSettings: GameSettingsState;
  user: UserState;
}
