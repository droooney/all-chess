import { Sequelize } from 'sequelize';

import config from 'server/db/config';

export default new Sequelize(config.development);

export * from './models';
