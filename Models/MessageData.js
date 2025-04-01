'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class MessageData extends Model {
    static associate(models) {
      // Define associations if needed
      MessageData.belongsTo(models.User, {
        foreignKey: 'user_id',
      });
      MessageData.hasMany(models.MessageDataType, { foreignKey: 'message_data_id' });
      MessageData.hasMany(models.MessageSection, { foreignKey: 'message_data_id' });
      MessageData.hasMany(models.TargetFriendSettings, { foreignKey: 'message' });
      MessageData.belongsToMany(models.Section, { through: models.MessageSection, foreignKey: 'message_data_id' });
    }
  }
  MessageData.init(
    {
      user_id: DataTypes.INTEGER,
      name: DataTypes.TEXT,
      varient: DataTypes.TEXT,
      randomcode: DataTypes.STRING(11),
      title: DataTypes.STRING(300),
      message: DataTypes.STRING(2000),
    },
    {
      sequelize,
      modelName: 'MessageData',
      tableName: 'message_data', // Make sure it matches the table name in the migration
      timestamps: false,
    }
  );
  return MessageData;
};
