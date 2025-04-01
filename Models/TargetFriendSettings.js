'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class TargetFriendSettings extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      TargetFriendSettings.belongsTo(models.Group, {
        foreignKey: 'group_id',
        as: 'groups',
      });
      TargetFriendSettings.belongsTo(models.MessageData, {
        foreignKey: 'message',
        as: 'messages',
      });
      TargetFriendSettings.belongsTo(models.Message, {
        foreignKey: "message",
        as: "newMessage",
      });
      TargetFriendSettings.belongsTo(models.Keyword, {
        foreignKey: 'keyword',
        as: 'keywords',
      });
    }
  }
  TargetFriendSettings.init(
    {
      user_id: DataTypes.INTEGER,
      grouptype: DataTypes.TEXT,
      group_id: DataTypes.TEXT,
      interval: DataTypes.STRING,
      norequest: DataTypes.TEXT,
      custom: DataTypes.TEXT,
      gender: DataTypes.TEXT,
      level: DataTypes.TEXT,
      resume: DataTypes.TEXT,
      country: DataTypes.TEXT,
      keyword: DataTypes.TEXT,
      negative_keyword: DataTypes.TEXT,
      group: DataTypes.TEXT,
      group_url: DataTypes.TEXT,
      message: DataTypes.TEXT,
      status: DataTypes.INTEGER,
      search_index: DataTypes.INTEGER,
      prospect: DataTypes.TEXT,
      selectedinterval: DataTypes.TEXT,
      datevalue: DataTypes.TEXT,
      action: DataTypes.TEXT,
      prospection_type: DataTypes.STRING,
      pro_convo: DataTypes.INTEGER,
      post_target: DataTypes.STRING,
      pro_stratagy:DataTypes.INTEGER,
      stratagy: {
        type: DataTypes.INTEGER,
        defaultValue: 0
      },
    },
    {
      sequelize,
      modelName: "TargetFriendSettings",
      tableName: "add_target_friend_settings",
      timestamps: false,
    }
  );
  return TargetFriendSettings;
};