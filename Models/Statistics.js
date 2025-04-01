"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Statistics extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
  }
  Statistics.init(
    {
      user_id: DataTypes.INTEGER,
      message_count: DataTypes.INTEGER,
      type: DataTypes.TEXT,
      created_at: DataTypes.DATE,
    },
    {
      sequelize,
      modelName: "Statistics",
      tableName: "statistics",
      timestamps: false,
    }
  );
  return Statistics;
};
