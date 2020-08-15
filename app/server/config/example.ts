import { Config } from 'server/types';

const config: Config = {
  cookieName: 'cookie_name',
  email: {
    auth: {
      user: 'username',
      pass: 'password',
    },
    from: {
      name: 'AllChess',
      email: 'all-chess.org',
    },
  },
  port: 5858,
  redis: {
    host: 'localhost',
    port: 6379,
  },
  secret: 'secret string',
};

export default config;
