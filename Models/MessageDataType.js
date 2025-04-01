'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class MessageDataType extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      MessageDataType.belongsTo(models.MessageData, { foreignKey: 'message_data_id' });
    }
  }
  MessageDataType.init({
    message_data_id: DataTypes.INTEGER,
    type: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'MessageDataType',
    tableName: 'message_data_type',
  });
  return MessageDataType;
};