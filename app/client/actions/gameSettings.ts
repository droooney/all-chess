import { ReduxThunkAction } from '../store';

import {
  GameSettings
} from '../../types';

import { writeSettingsToLocalStorage } from '../helpers';

export const GameSettingsActions = {
  CHANGE_SETTINGS: 'CHANGE_SETTINGS' as const
};

export function changeSettingsInState<K extends keyof GameSettings>(key: K, value: GameSettings[K]) {
  return {
    type: GameSettingsActions.CHANGE_SETTINGS,
    key,
    value
  };
}

export function changeSettings<K extends keyof GameSettings>(key: K, value: GameSettings[K]): ReduxThunkAction<void> {
  return (dispatch) => {
    writeSettingsToLocalStorage(key, value);

    dispatch(changeSettingsInState(key, value));
  };
}
