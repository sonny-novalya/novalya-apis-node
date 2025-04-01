"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Category extends Model {
    static associate(models) {
      // Category has many Messages
      Category.hasMany(models.Message, {
        foreignKey: "category_id",
        as: "messages", // Alias for including the messages
      });
    }
  }
  Category.init(
    {
      user_id: DataTypes.INTEGER,
      name: DataTypes.TEXT,
      created_at: DataTypes.DATE,
    },
    {
      sequelize,
      modelName: "Category",
      tableName: "categories",
      timestamps: false,
    }
  );
  return Category;
};
