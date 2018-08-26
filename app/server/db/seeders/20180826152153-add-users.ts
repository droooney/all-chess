import { Op } from 'sequelize';

import { User } from '../';

const users = [{
  email: 'a123@a.com',
  login: '123',
  password: '123',
  confirmed: true
}, {
  email: 'a@a.com',
  login: '1',
  password: '123'
}];

export async function up() {
  await User.bulkCreate(users);
}

export async function down() {
  await User.destroy({
    where: {
      login: {
        [Op.in]: users.map(({ login }) => login)
      }
    }
  });
}
