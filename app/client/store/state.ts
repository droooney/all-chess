import {
  GameSettings,
  User
} from '../../types';

export type UserState = User | null;

export type GameSettingsState = GameSettings;

export interface ReduxState {
  gameSettings: GameSettingsState;
  user: UserState;
}
