"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Keyword extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
        Keyword.hasMany(models.KeywordType, {
          foreignKey: "keyword_id",
          as: "KeywordType",
        });
    }
  }
  Keyword.init(
    {
      name: {
        type: DataTypes.TEXT,
      },
      user_id: {
        type: DataTypes.INTEGER,
      },
      positive_keyword: {
        type: DataTypes.TEXT,
      },
      negative_keyword: {
        type: DataTypes.TEXT,
      },
      created_at: {
        type: DataTypes.DATE,
      },
      updated_at: {
        type: DataTypes.DATE,
      },
    },
    {
      sequelize,
      modelName: "Keywords",
      tableName: "keywords",
      timestamps: false,
    }
  );
  return Keyword;
};
