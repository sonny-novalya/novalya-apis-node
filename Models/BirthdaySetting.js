'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class BirthdaySetting extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      BirthdaySetting.belongsTo(models.MessageData, {
        foreignKey: 'birthday_id', // Name of the foreign key in BirthdaySetting
        as: 'message', // Alias for the association, you can use any name you prefer
      });

      BirthdaySetting.belongsTo(models.Message, {
        foreignKey: "birthday_id",
        as: "newMessage",
      });
    }
  }
  BirthdaySetting.init({
    user_id: DataTypes.INTEGER,
    type: DataTypes.TEXT,
    time_interval: DataTypes.INTEGER,
    birthday_id: DataTypes.INTEGER,
    birthday_type: DataTypes.TEXT,
    action: DataTypes.TEXT,
    prospect: DataTypes.STRING(11),
    name: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'BirthdaySetting',
    tableName: 'birthday_setting',
    timestamps: false,
  });
  return BirthdaySetting;
};