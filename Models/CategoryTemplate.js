"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class CategoryTemplate extends Model {
    static associate(models) {
      // CategoryTemplate has many Messages
      CategoryTemplate.hasMany(models.Message, {
        foreignKey: "category_id",
        as: "messages", // Alias for including the messages
      });
    }
  }
  CategoryTemplate.init(
    {
      user_id: DataTypes.INTEGER,
      name: DataTypes.TEXT,
      created_at: DataTypes.DATE,
    },
    {
      sequelize,
      modelName: "CategoryTemplate",
      tableName: "categories_templates",
      timestamps: false,
    }
  );
  return CategoryTemplate;
};
