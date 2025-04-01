'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Birthday extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    
  }
  Birthday.init({
    user_id: DataTypes.INTEGER,
    type: DataTypes.TEXT,
    name: DataTypes.TEXT,
    varient: DataTypes.TEXT,
  }, {
    sequelize,
    modelName: 'Birthday',
    tableName: 'birthday',
    timestamps: false,
  });
  return Birthday;
};