'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Folder extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    
  }
  Folder.init(
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
      },
      name: {
        type: DataTypes.TEXT,
      },
      user_id: {
        type: DataTypes.INTEGER,
      },
      media: {
        type: DataTypes.TEXT,
        defaultValue: "instagram",
      },
    },
    {
      sequelize,
      modelName: "Folder",
      tableName: "folders",
      timestamps: false,
    }
  );
  return Folder;
};