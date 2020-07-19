import '../shared/plugins';

import server from './server';
import config from './config';

import './routes';
import './sockets';

(async () => {
  await new Promise((resolve) => {
    server.listen(config.port, () => {
      resolve(config.port);
    });
  });

  console.log(`Listening on ${config.port}...`);
})();
