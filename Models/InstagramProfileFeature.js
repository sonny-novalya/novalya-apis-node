'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class InstagramProfileFeature extends Model {
    static associate(models) {
      // Define associations here if needed
    }
  }
  InstagramProfileFeature.init({
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER
    },
    insta_user_id: {
      type: DataTypes.STRING
    },
    insta_numeric_id: {
      type: DataTypes.STRING
    },
    insta_user_name: {
      type: DataTypes.STRING
    },
    user_id: {
      type: DataTypes.INTEGER
    },
    following: {
      type: DataTypes.INTEGER
    },
    total_followers: {
      type: DataTypes.INTEGER
    },
    is_verified_acc: {
      type: DataTypes.BOOLEAN,
      default: false,
    },
    profile_image: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    posts: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
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
    modelName: 'InstagramProfileFeature',
    tableName: 'instagram_profile_features',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  });
  return InstagramProfileFeature;
};
