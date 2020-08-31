import { Sequelize } from 'sequelize';

import config from 'server/db/config';

const db = new Sequelize(config.development);

export default db;
