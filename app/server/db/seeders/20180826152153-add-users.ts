import { User, UserAddAttributes } from '../models';

const users: UserAddAttributes[] = [{
  email: 'a123@a.com',
  login: '123',
  password: '123',
  confirmed: true,
}, {
  email: 'a@a.com',
  login: '1',
  password: '123',
}];

export async function up() {
  await User.bulkCreate(users);
}

export async function down() {
  await User.truncate();
}
