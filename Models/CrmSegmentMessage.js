'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class CrmSegmentMessage extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
  }
  CrmSegmentMessage.init({
    user_id: DataTypes.INTEGER,
    section: DataTypes.TEXT,
    name: DataTypes.TEXT,
  }, {
    sequelize,
    modelName: 'CrmSegmentMessage',
    tableName: 'crm_segment_message',
    timestamps: false
  });
  return CrmSegmentMessage;
};