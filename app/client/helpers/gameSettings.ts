import keys from 'lodash/keys';

import { GAME_DEFAULT_SETTINGS } from 'client/constants';

import { GameSettings } from 'client/types';

function getLocalStorageSettingsKey(key: string): string {
  return `settings.${key}`;
}

export function writeSettingsToLocalStorage<K extends keyof GameSettings>(key: K, value: GameSettings[K]) {
  localStorage.setItem(getLocalStorageSettingsKey(key), JSON.stringify(value));
}

export function getDefaultSettings(): GameSettings {
  const settings = { ...GAME_DEFAULT_SETTINGS };

  keys(settings).forEach((key) => {
    let localStorageValue = null;
    let loadedFromStorage = false;

    try {
      const storageValue = localStorage.getItem(getLocalStorageSettingsKey(key));

      if (storageValue !== null) {
        localStorageValue = JSON.parse(storageValue);
        loadedFromStorage = true;
      }
    } catch {}

    if (loadedFromStorage) {
      settings[key as keyof GameSettings] = localStorageValue as never;
    } else {
      writeSettingsToLocalStorage(key as keyof GameSettings, settings[key as keyof GameSettings]);
    }
  });

  return settings;
}
