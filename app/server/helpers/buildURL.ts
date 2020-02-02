import * as qs from 'querystring';
import * as _ from 'lodash';

export interface BuildURLOptions {
  protocol: string;
  host: string;
  path: string;
  query?: Record<string, string>;
}

export function buildURL(options: BuildURLOptions): string {
  let search = '';

  if (!_.isEmpty(options.query)) {
    search = `?${qs.stringify(options.query)}`;
  }

  return `${options.protocol}://${options.host + options.path + search}`;
}
