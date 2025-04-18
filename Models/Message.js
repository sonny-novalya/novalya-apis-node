"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Message extends Model {
    static associate(models) {
      // Message has many MessageVariants
      Message.hasMany(models.MessageVariant, {
        foreignKey: "message_id",
        as: "variants", // Alias for including the variants
      });

      Message.belongsTo(models.Category, {
        foreignKey: "category_id",
        as: "category",
      });
    }
  }
  Message.init(
    {
      user_id: DataTypes.INTEGER,
      category_id: DataTypes.INTEGER,
      title: DataTypes.TEXT,
      created_at: DataTypes.DATE,
      language: DataTypes.STRING,
      // attachment: {
      //   type: DataTypes.TEXT,
      //   allowNull: true,
      // },
      visibility_type: DataTypes.STRING,
      favorite: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
    },
    {
      sequelize,
      modelName: "Message",
      tableName: "messages",
      timestamps: false,
    }
  );
  return Message;
};
