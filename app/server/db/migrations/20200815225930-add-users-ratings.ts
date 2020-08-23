import { DataTypes, QueryInterface } from 'sequelize';

const TABLE_NAME = 'users';
const COLUMN_NAME = 'ratings';

export async function up(queryInterface: QueryInterface) {
  await queryInterface.addColumn(TABLE_NAME, COLUMN_NAME, {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {},
  });
}

export async function down(queryInterface: QueryInterface) {
  await queryInterface.removeColumn(TABLE_NAME, COLUMN_NAME);
}
