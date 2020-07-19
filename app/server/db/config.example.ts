import { DBConfig } from '../../shared/types';

const config: DBConfig = {
  development: {
    username: 'root',
    database: 'all_chess_dev',
    host: 'localhost',
    dialect: 'postgres'
  },
  test: {
    username: 'root',
    database: 'all_chess_test',
    host: 'localhost',
    dialect: 'postgres'
  },
  production: {
    username: 'root',
    database: 'all_chess_prod',
    host: 'localhost',
    dialect: 'postgres'
  }
};

export = config;
