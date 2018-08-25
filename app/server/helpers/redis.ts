import * as redis from 'redis';

import config from '../config';

export function createClient(returnBuffers?: boolean) {
  const options: redis.ClientOpts = { ...config.redis };

  if (returnBuffers) {
    /* eslint camelcase: 0 */
    options.return_buffers = true;
  }

  const client = redis.createClient(options);

  client.on('error', (err) => {
    console.error(err);
  });

  return client;
}
