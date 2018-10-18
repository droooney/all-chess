import * as _ from 'lodash';

import { Game, GameMinimalData } from '../../types';

export function pickGameMinimalData(game: Game): GameMinimalData {
  return _.pick(game, [
    'id',
    'status',
    'players',
    'result',
    'timeControl',
    'variants'
  ]);
}
