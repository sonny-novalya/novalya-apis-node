'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('facebook_profiles_features', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      fb_user_id: {
        type: Sequelize.STRING
      },
      user_id: {
        type: Sequelize.INTEGER
      },
      fb_user_name: {
        type: Sequelize.STRING
      },
      total_friends: {
        type: Sequelize.INTEGER
      },
      following: {
        type: Sequelize.INTEGER
      },
      followers: {
        type: Sequelize.INTEGER
      },
      profile_image: {
        type: Sequelize.STRING,
        allowNull: true,
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
    await queryInterface.dropTable('facebook_profiles_features');
  }
};
