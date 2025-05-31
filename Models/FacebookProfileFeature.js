'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class FacebookProfileFeature extends Model {
    static associate(models) {
      // Define associations here if needed
    }
  }
  FacebookProfileFeature.init({
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER
    },
    fb_user_id: {
      type: DataTypes.STRING
    },
    user_id: {
      type: DataTypes.INTEGER
    },
    fb_user_name: {
      type: DataTypes.STRING
    },
    total_friends: {
      type: DataTypes.INTEGER
    },
    following: {
      type: DataTypes.STRING
    },
    followers: {
      type: DataTypes.INTEGER
    },
    is_verified_acc: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    profile_image: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    createdAt: {
      allowNull: false,
      type: DataTypes.DATE
    },
    updatedAt: {
      allowNull: false,
      type: DataTypes.DATE
    }
  }, {
    sequelize,
    modelName: 'FacebookProfileFeature',
    tableName: 'facebook_profiles_features',
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
  });
  return FacebookProfileFeature;
};
