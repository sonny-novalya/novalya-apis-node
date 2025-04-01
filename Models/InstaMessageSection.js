'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class InstaMessageSection extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      InstaMessageSection.belongsTo(models.InstaMessageData, { foreignKey: 'message_data_id' });
    }
  }
  InstaMessageSection.init({
    message_data_id: DataTypes.INTEGER,
    section_id: DataTypes.INTEGER
  }, {
    sequelize,
    modelName: 'InstaMessageSection',
    tableName: 'insta_message_section',
    timestamps: true
  });
  return InstaMessageSection;
};