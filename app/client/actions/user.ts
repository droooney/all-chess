import { ShortUser } from '../../types';

export enum UserActions {
  SET_USER_DATA = 'SET_USER_DATA'
}

export interface SetUserDataAction {
  type: UserActions.SET_USER_DATA;
  user: ShortUser | null;
}

export function setUserData(user: ShortUser | null): SetUserDataAction {
  return {
    type: UserActions.SET_USER_DATA,
    user
  };
}
