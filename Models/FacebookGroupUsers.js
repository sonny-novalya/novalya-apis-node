'use strict';
const {
  Model
} = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class FacebookGroupUsers extends Model {
    static associate(models) {
      // Define associations here if needed
    }
  }
  FacebookGroupUsers.init({
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
    fb_user_id: {
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
    modelName: 'FacebookGroupUsers',
    tableName: 'facebook_group_users',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  });
  return FacebookGroupUsers;
};
