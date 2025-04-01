'use strict';
const {
  Model
} = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class InstagramGroupUsers extends Model {
    static associate(models) {
      // Define associations here if needed
    }
  }
  InstagramGroupUsers.init({
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER
    },
    group_id: {
      type: DataTypes.BIGINT,
      allowNull: false
    },
    user_id: {
      type: DataTypes.BIGINT,
      allowNull: false
    },
    instagram_user_id: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    browser_insta_user_id: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    created_at: {
      allowNull: false,
      type: DataTypes.DATE
    },
    updated_at: {
      allowNull: false,
      type: DataTypes.DATE
    }
  }, {
    sequelize,
    modelName: 'InstagramGroupUsers',
    tableName: 'instagram_group_users',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  });
  return InstagramGroupUsers;
};
