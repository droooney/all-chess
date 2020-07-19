import 'shared/plugins';

import config from 'server/config';

import server from 'server/server';

import 'server/routes';
import 'server/sockets';

(async () => {
  await new Promise((resolve) => {
    server.listen(config.port, () => {
      resolve(config.port);
    });
  });

  console.log(`Listening on ${config.port}...`);
})();
