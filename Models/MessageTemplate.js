"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class MessageTemplate extends Model {
    static associate(models) {
      // Message has many MessageVariants
      MessageTemplate.hasMany(models.MessageVariantTemplate, {
        foreignKey: "message_id",
        as: "variants", // Alias for including the variants
      });

      MessageTemplate.belongsTo(models.CategoryTemplate, {
        foreignKey: "category_id",
        as: "category",
      });
    }
  }
  MessageTemplate.init(
    {
      user_id: DataTypes.INTEGER,
      category_id: DataTypes.INTEGER,
      title: DataTypes.TEXT,
      created_at: DataTypes.DATE,
      language: DataTypes.STRING,
      visibility_type: DataTypes.STRING,
      favorite: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
    },
    {
      sequelize,
      modelName: "Message",
      tableName: "messages_template",
      timestamps: false,
    }
  );
  return MessageTemplate;
};
