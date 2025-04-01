'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class CrmTargetFriendSettings extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      CrmTargetFriendSettings.belongsTo(models.MessageData, {
        foreignKey: 'message',
        as: 'messages',
      });
    }
  }
  CrmTargetFriendSettings.init({
    user_id: DataTypes.INTEGER,
    label_id: DataTypes.TEXT,
    interval: DataTypes.STRING,
    norequest: DataTypes.TEXT,
    custom: DataTypes.TEXT,
    gender: DataTypes.TEXT,
    message: DataTypes.TEXT,
    status: DataTypes.INTEGER,
    search_index: DataTypes.INTEGER
  }, {
    sequelize,
    modelName: 'CrmTargetFriendSettings',
    tableName: 'crm_add_target_friend_settings',
    timestamps: false
  });
  return CrmTargetFriendSettings;
};