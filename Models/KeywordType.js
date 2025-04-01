"use strict";
const { DataTypes, Model } = require("sequelize");

module.exports = (sequelize) => {
  class KeywordType extends Model {
    static associate(models) {
      KeywordType.belongsTo(models.Keyword, {
        foreignKey: "keyword_id",
        as: "keyword",
      });
    }
  }

  KeywordType.init(
    {
      keyword_id: DataTypes.INTEGER,
      type: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "KeywordType",
      tableName: "keyword_types",
      timestamps: false,
    }
  );

  return KeywordType;
};
