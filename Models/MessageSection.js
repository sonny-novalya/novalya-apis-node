'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class MessageSection extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      MessageSection.belongsTo(models.MessageData, { foreignKey: 'message_data_id' });
    }
  }
  MessageSection.init({
    message_data_id: DataTypes.INTEGER,
    section_id: DataTypes.INTEGER
  }, {
    sequelize,
    modelName: 'MessageSection',
    tableName: 'message_section',
    timestamps: true
  });
  return MessageSection;
};