import { CustomThunkAction } from '../store';

import {
  GameSettings
} from '../../types';

import { writeSettingsToLocalStorage } from '../helpers';

export enum GameSettingsActions {
  CHANGE_SETTINGS = 'CHANGE_SETTINGS'
}

export interface ChangeSettingsInStateAction<K extends keyof GameSettings> {
  type: GameSettingsActions.CHANGE_SETTINGS;
  key: K;
  value: GameSettings[K];
}

function changeSettingsInState<K extends keyof GameSettings>(key: K, value: GameSettings[K]): ChangeSettingsInStateAction<K> {
  return {
    type: GameSettingsActions.CHANGE_SETTINGS,
    key,
    value
  };
}

export function changeSettings<K extends keyof GameSettings>(key: K, value: GameSettings[K]): CustomThunkAction<void> {
  return (dispatch) => {
    writeSettingsToLocalStorage(key, value);

    dispatch(changeSettingsInState(key, value));
  };
}
