import server from './server';
import config from './config';

export async function listen(): Promise<number> {
  return new Promise<number>((resolve) => {
    server.listen(config.port, () => {
      resolve(config.port);
    });
  });
}
