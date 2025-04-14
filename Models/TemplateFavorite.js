"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class TemplateFavorite extends Model {
    static associate(models) {
      // Message has many MessageVariants
      // TemplateFavorite.hasMany(models.MessageVariant, {
      //   foreignKey: "message_id",
      //   as: "variants", // Alias for including the variants
      // });

      TemplateFavorite.belongsTo(models.MessageTemplate, {
        foreignKey: "template_id",
        as: "template",
      });
    }
  }
  TemplateFavorite.init(
    {
      user_id: DataTypes.INTEGER,
      template_id: DataTypes.INTEGER,
      favorite: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
    },
    {
      sequelize,
      modelName: "TemplateFavorite",
      tableName: "template_favorite",
      timestamps: false,
    }
  );
  return TemplateFavorite;
};
