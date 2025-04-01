'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class InstaMessageDataType extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      InstaMessageDataType.belongsTo(models.MessageData, { foreignKey: 'message_data_id' });
    }
  }
  InstaMessageDataType.init({
    message_data_id: DataTypes.INTEGER,
    type: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'InstaMessageDataType',
    tableName: 'insta_message_data_type',
  });
  return InstaMessageDataType;
};