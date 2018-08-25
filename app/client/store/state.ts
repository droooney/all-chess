import { User } from '../../types';

export type UserState = User | null;

export interface ReduxState {
  user: UserState;
}
