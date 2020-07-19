import { ShortUser } from '../../types';

export const UserActions = {
  SET_USER_DATA: 'SET_USER_DATA' as const
};

export function setUserData(user: ShortUser | null) {
  return {
    type: UserActions.SET_USER_DATA,
    user
  };
}
