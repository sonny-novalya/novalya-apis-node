'use strict';
const {
  Model
} = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class BirthdayWishes extends Model {
    static associate(models) {
      // Define associations here if needed
    }
  }
  BirthdayWishes.init({
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER
    },
    user_id: {
      type: DataTypes.BIGINT,
      allowNull: false
    },
    fb_user_id: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    connected_fb_user_id: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    birthday_type: {
      type: DataTypes.STRING(255)
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
    modelName: 'BirthdayWishes',
    tableName: 'birthday_wish',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  });
  return BirthdayWishes;
};
