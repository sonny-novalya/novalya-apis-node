'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('instataggedusers', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      insta_user_id: {
        type: Sequelize.TEXT
      },
      numeric_insta_id: {
        type: Sequelize.TEXT
      },
      insta_image_id: {
        type: Sequelize.STRING(500)
      },
      insta_name: {
        type: Sequelize.STRING(1000)
      },
      profile_pic: {
        type: Sequelize.STRING(500),
        allowNull: false
      },
      tag_id: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      stage_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1
      },
      is_primary: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      createdAt: {
        allowNull: true,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      user_note: {
        type: Sequelize.TEXT
      }
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('instataggedusers');
  }
};
