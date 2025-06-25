"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class UserPlanLimit extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
  }
  UserPlanLimit.init(
    {
        userid: DataTypes.INTEGER,
        fb_no_crm_group: DataTypes.INTEGER,
        fb_no_stages_group: DataTypes.INTEGER,
        fb_no_friend_request: DataTypes.INTEGER,
        fb_no_crm_message: DataTypes.INTEGER,
        fb_no_ai_comment: DataTypes.INTEGER,
        fb_advanced_novadata: DataTypes.INTEGER,
        fb_no_friend_requests_received: DataTypes.INTEGER,
        fb_no_of_birthday_wishes: DataTypes.INTEGER,
        insta_no_crm_group: DataTypes.INTEGER,
        insta_no_stages_group: DataTypes.INTEGER,
        insta_no_friend_request: DataTypes.INTEGER,
        insta_no_crm_message: DataTypes.INTEGER,
        insta_no_ai_comment: DataTypes.INTEGER,
        insta_advanced_novadata: DataTypes.INTEGER,
        insta_no_friend_requests_received: DataTypes.INTEGER,
        insta_no_of_birthday_wishes: DataTypes.INTEGER,
        fb_messages:DataTypes.INTEGER,
        insta_messages:DataTypes.INTEGER,
        ai_credits_new:DataTypes.INTEGER,
        tags_pipelines:DataTypes.INTEGER,
        message_limit:DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: "UserPlanLimit",
      tableName: "users_limits",
      timestamps: false,
    }
  );
  return UserPlanLimit;
};
