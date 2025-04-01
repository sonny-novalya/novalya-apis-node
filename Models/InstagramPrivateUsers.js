'use strict';
const {
  Model
} = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class InstagramPrivateUsers extends Model {
    static associate(models) {
      // Define associations here if needed
    }
  }
  InstagramPrivateUsers.init({
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
    private_insta_account: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    insta_login_account: {
        type: DataTypes.STRING(100),
        allowNull: false
    }
  }, {
    sequelize,
    modelName: 'InstagramPrivateUsers',
    tableName: 'instagram_private_users',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  });
  return InstagramPrivateUsers;
};
