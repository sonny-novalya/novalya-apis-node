'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('instatags', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      name: {
        type: Sequelize.STRING
      },
      user_id: {
        type: Sequelize.INTEGER
      },
      class: {
        type: Sequelize.STRING
      },
      custom_color: {
        type: Sequelize.STRING
      },
      order_num: {
        type: Sequelize.INTEGER
      },
      total_user: {
        type: Sequelize.INTEGER
      },
      is_primary: {
        type: Sequelize.INTEGER
      },
      randomCode: {
        type: Sequelize.STRING
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('instatags');
  }
};