import { User } from '../../types';

export enum UserActions {
  SET_USER_DATA = 'SET_USER_DATA'
}

export interface SetUserDataAction {
  type: UserActions.SET_USER_DATA;
  user: User | null;
}

export function setUserData(user: User | null): SetUserDataAction {
  return {
    type: UserActions.SET_USER_DATA,
    user
  };
}
