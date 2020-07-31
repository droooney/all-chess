import { GameSettings } from 'client/types';

import { writeSettingsToLocalStorage } from 'client/helpers';

import { ReduxThunkAction } from 'client/store';

export const GameSettingsActions = {
  CHANGE_SETTINGS: 'CHANGE_SETTINGS' as const,
  LOAD_SETTINGS: 'LOAD_SETTINGS' as const,
};

export function changeSettingsInState<K extends keyof GameSettings>(key: K, value: GameSettings[K]) {
  return {
    type: GameSettingsActions.CHANGE_SETTINGS,
    key,
    value,
  };
}

export function changeSettings<K extends keyof GameSettings>(key: K, value: GameSettings[K]): ReduxThunkAction<void> {
  return (dispatch) => {
    writeSettingsToLocalStorage(key, value);

    dispatch(changeSettingsInState(key, value));
  };
}

export function loadSettings(settings: GameSettings) {
  return {
    type: GameSettingsActions.LOAD_SETTINGS,
    settings,
  };
}
