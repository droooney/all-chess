import isEmpty from 'lodash/isEmpty';
import * as qs from 'querystring';

import { Dictionary } from 'shared/types';

export interface BuildURLOptions {
  protocol: string;
  host: string;
  path: string;
  query?: Dictionary<string>;
}

export function buildURL(options: BuildURLOptions): string {
  let search = '';

  if (!isEmpty(options.query)) {
    search = `?${qs.stringify(options.query)}`;
  }

  return `${options.protocol}://${options.host + options.path + search}`;
}
