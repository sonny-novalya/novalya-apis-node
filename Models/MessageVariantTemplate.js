"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class MessageVariantTemplate extends Model {
    static associate(models) {
      // MessageVariantTemplate belongs to a Message
      MessageVariantTemplate.belongsTo(models.MessageTemplate, {
        foreignKey: "message_id",
        as: "message",
      });
    }
  }
  MessageVariantTemplate.init(
    {
      message_id: DataTypes.INTEGER,
      name: DataTypes.TEXT,
      created_at: DataTypes.DATE,
    },
    {
      sequelize,
      modelName: "MessageVariantTemplate",
      tableName: "message_variant_template",
      timestamps: false,
    }
  );
  return MessageVariantTemplate;
};
