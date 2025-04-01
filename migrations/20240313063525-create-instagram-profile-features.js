'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('instagram_profile_features', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      insta_user_id: {
        type: Sequelize.STRING
      },
      user_id: {
        type: Sequelize.INTEGER
      },
      insta_user_name: {
        type: Sequelize.STRING
      },
      following: {
        type: Sequelize.INTEGER
      },
      total_followers: {
        type: Sequelize.INTEGER
      },
      profile_image: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('instagram_profile_features');
  }
};
