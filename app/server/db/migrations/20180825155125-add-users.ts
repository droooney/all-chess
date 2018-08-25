import * as Sequelize from 'sequelize';

const TABLE_NAME = 'users';

export async function up(queryInterface: Sequelize.QueryInterface) {
  await queryInterface.createTable(TABLE_NAME, {
    id: {
      type: Sequelize.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    login: {
      type: Sequelize.STRING,
      allowNull: false,
      unique: true
    },
    password: {
      type: Sequelize.STRING
    },
    createdAt: {
      type: Sequelize.DATE,
      field: 'created_at',
      allowNull: false
    },
    updatedAt: {
      type: Sequelize.DATE,
      field: 'updated_at',
      allowNull: false
    }
  });
}

export async function down(queryInterface: Sequelize.QueryInterface) {
  await queryInterface.dropTable(TABLE_NAME);
}
