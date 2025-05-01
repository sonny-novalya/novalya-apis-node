'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Novadata extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    
  }
  Novadata.init({
    user_id: DataTypes.INTEGER,
    type: DataTypes.TEXT,
    fbId: DataTypes.TEXT,
    status: DataTypes.INTEGER,
    user_name: DataTypes.TEXT,
    gender: DataTypes.TEXT,
    profile: DataTypes.TEXT,
    image: DataTypes.TEXT,
    lived: DataTypes.TEXT,
    email: DataTypes.TEXT,
    contact: DataTypes.TEXT,
    facebook: DataTypes.TEXT,
    linkedIn: DataTypes.TEXT,
    facebook: DataTypes.TEXT,
    linkedIn: DataTypes.TEXT,
    youTube: DataTypes.TEXT,
    instagram: DataTypes.TEXT,
    twitter: DataTypes.TEXT,
    pinterest: DataTypes.INTEGER,
    comments: DataTypes.INTEGER,
    messages: DataTypes.INTEGER,
    reactions: DataTypes.INTEGER,
    tier: DataTypes.TEXT,
    has_conversection: DataTypes.INTEGER,
    mutual_friend: DataTypes.INTEGER,
    Tag:{
      type: DataTypes.STRING,
      allowNull: true 
    },
    Tag_id:{
      type: DataTypes.INTEGER,
      allowNull: true 
    },
    rgb:{
      type: DataTypes.STRING,
      allowNull: true
    },
    hometown: DataTypes.STRING,
    birthday: DataTypes.STRING,
    languages: DataTypes.STRING,
    locale: DataTypes.STRING,
    age: DataTypes.STRING,
  }, {
    sequelize,
    modelName: 'Novadata',
    tableName: 'nova_data',
    timestamps: false
  });
  return Novadata;
};