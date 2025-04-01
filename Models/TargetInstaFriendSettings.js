'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class TargetInstaFriendSettings extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      TargetInstaFriendSettings.belongsTo(models.InstaGroup, {
        foreignKey: "group_id",
        as: "groups",
      });
      TargetInstaFriendSettings.belongsTo(models.InstaMessageData, {
        foreignKey: "message",
        as: "messages",
      });
      TargetInstaFriendSettings.belongsTo(models.InstaKeyword, {
        foreignKey: "keyword",
        as: "keywords",
      });
    }
  }
  TargetInstaFriendSettings.init(
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
    },
    {
      sequelize,
      modelName: "TargetInstaFriendSettings",
      tableName: "add_instagram_target_friend_settings",
      timestamps: false,
    }
  );
  return TargetInstaFriendSettings;
};