'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Prospects extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    
  }
  Prospects.init({
    user_id: DataTypes.INTEGER,
    fb_user_id: DataTypes.TEXT,
    date_add: DataTypes.DATE,
  }, {
    sequelize,
    modelName: 'Prospects',
    tableName: 'prospects',
    timestamps: false
  });
  return Prospects;
};