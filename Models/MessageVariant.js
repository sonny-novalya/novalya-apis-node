"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class MessageVariant extends Model {
    static associate(models) {
      // MessageVariant belongs to a Message
      MessageVariant.belongsTo(models.Message, {
        foreignKey: "message_id",
        as: "message",
      });
    }
  }
  MessageVariant.init(
    {
      message_id: DataTypes.INTEGER,
      name: DataTypes.TEXT,
      created_at: DataTypes.DATE,
    },
    {
      sequelize,
      modelName: "MessageVariant",
      tableName: "message_variant",
      timestamps: false,
    }
  );
  return MessageVariant;
};
