'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Lost extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    
  }
  Lost.init({
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
    modelName: 'Lost',
    tableName: 'nova_data_lost',
    timestamps: false
  });
  return Lost;
};