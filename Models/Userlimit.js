"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Userlimit extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
  }
  Userlimit.init(
    {
      plan_id: DataTypes.INTEGER,
      user_id: DataTypes.INTEGER,
      no_crm_group: DataTypes.INTEGER,
      no_stages_group: DataTypes.INTEGER,
      no_friend_request: DataTypes.INTEGER,
      no_crm_message: DataTypes.INTEGER,
      no_ai_comment: DataTypes.INTEGER,
      advanced_novadata: DataTypes.INTEGER,
      no_friend_requests_received: DataTypes.INTEGER,
      no_of_birthday_wishes: DataTypes.INTEGER,
      no_insta_prospection: DataTypes.INTEGER,
      no_insta_crm: DataTypes.INTEGER,
      no_insta_ai_comment: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: "Userlimit",
      tableName: "plan_limit",
      timestamps: false,
    }
  );
  return Userlimit;
};
