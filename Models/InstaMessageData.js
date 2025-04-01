'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class InstaMessageData extends Model {
    static associate(models) {
      // Define associations if needed
      InstaMessageData.belongsTo(models.User, {
        foreignKey: 'user_id',
      });
      InstaMessageData.hasMany(models.InstaMessageDataType, { foreignKey: 'message_data_id' });
      InstaMessageData.hasMany(models.InstaMessageSection, { foreignKey: 'message_data_id' });
      InstaMessageData.hasMany(models.TargetFriendSettings, { foreignKey: 'message' });
      InstaMessageData.belongsToMany(models.InstaSection, { through: models.InstaMessageSection, foreignKey: 'message_data_id' });
    }
  }
  InstaMessageData.init(
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
      modelName: 'InstaMessageData',
      tableName: 'insta_message_data', // Make sure it matches the table name in the migration
      timestamps: false,
    }
  );
  return InstaMessageData;
};
