import { GameSettings } from '../../types';
import { GameSettingsState } from '../store';
import {
  GameSettingsActions,

  ChangeSettingsInStateAction
} from '../actions';
import { getDefaultSettings } from '../helpers';

const initialState: GameSettingsState = getDefaultSettings();

type Action = (
  ChangeSettingsInStateAction<keyof GameSettings>
  | { type: '' }
);

export default (
  state: GameSettingsState = initialState,
  action: Action
): GameSettingsState => {
  switch (action.type) {
    case GameSettingsActions.CHANGE_SETTINGS: {
      return {
        ...state,
        [action.key]: action.value
      };
    }

    default: {
      return state;
    }
  }
};
