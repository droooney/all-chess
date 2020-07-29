import * as _ from 'lodash';

import { GAME_DEFAULT_SETTINGS } from 'client/constants';

import { GameSettings } from 'shared/types';

function getLocalStorageSettingsKey(key: string): string {
  return `settings.${key}`;
}

export function writeSettingsToLocalStorage<K extends keyof GameSettings>(key: K, value: GameSettings[K]) {
  localStorage.setItem(getLocalStorageSettingsKey(key), JSON.stringify(value));
}

export function getDefaultSettings(): GameSettings {
  const settings = { ...GAME_DEFAULT_SETTINGS };

  _.keys(settings).forEach((key) => {
    let localStorageValue = null;

    try {
      localStorageValue = JSON.parse(localStorage.getItem(getLocalStorageSettingsKey(key))!);
    } catch {
      /* empty */
    }

    if (localStorageValue === null) {
      writeSettingsToLocalStorage(key as keyof GameSettings, settings[key as keyof GameSettings]);
    } else {
      settings[key as keyof GameSettings] = localStorageValue;
    }
  });

  return settings;
}
