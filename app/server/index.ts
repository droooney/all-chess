import server from './server';
import config from './config';

import './routes';
import './sockets';

export async function listen(): Promise<number> {
  return new Promise<number>((resolve) => {
    server.listen(config.port, () => {
      resolve(config.port);
    });
  });
}
