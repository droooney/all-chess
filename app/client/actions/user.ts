import { PublicUser } from '../../shared/types';

export const UserActions = {
  SET_USER_DATA: 'SET_USER_DATA' as const
};

export function setUserData(user: PublicUser | null) {
  return {
    type: UserActions.SET_USER_DATA,
    user
  };
}
