'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Deactivated extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    
  }
  Deactivated.init({
    user_id: DataTypes.INTEGER,
    type: DataTypes.TEXT,
    fbId: DataTypes.TEXT,
    status: DataTypes.INTEGER,
    user_name: DataTypes.TEXT,
    gender: DataTypes.TEXT,
    profile: DataTypes.TEXT,
    image: DataTypes.TEXT,
    lived: DataTypes.TEXT,
    friendship_age: DataTypes.TEXT,
    reactions: DataTypes.INTEGER,
    comments: DataTypes.INTEGER,
    messages: DataTypes.INTEGER,
    tier: DataTypes.TEXT,
    has_conversection: DataTypes.INTEGER,
  }, {
    sequelize,
    modelName: 'Deactivated',
    tableName: 'nova_data_deactivated',
    timestamps: false
  });
  return Deactivated;
};