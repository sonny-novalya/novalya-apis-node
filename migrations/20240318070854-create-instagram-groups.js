'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('instagroups', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      name: {
        type: Sequelize.TEXT
      },
      user_id: {
        type: Sequelize.INTEGER
      },
      order: {
        type: Sequelize.INTEGER
      },
      type: {
        type: Sequelize.TEXT
      },
      total_member: {
        type: Sequelize.TEXT
      },
      group_type: {
        type: Sequelize.TEXT
      },
      url: {
        type: Sequelize.TEXT
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE
      },
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('instagroups');
  }
};
