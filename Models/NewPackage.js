"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class NewPackage extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  NewPackage.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      userid: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      pkg_name: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "None",
      },
      amount: {
        type: DataTypes.INTEGER,
        defaultValue: "",
        allowNull: false,
      },
      subscriptionid: {
        type: DataTypes.STRING,
        defaultValue: "",
        allowNull: true,
      },
      customerid: {
        type: DataTypes.STRING,
        defaultValue: "",
        allowNull: true,
      },
      currency: {
        type: DataTypes.STRING,
        defaultValue: "",
        allowNull: true,
      },
      planid: {
        type: DataTypes.STRING,
        defaultValue: "",
        allowNull: true,
      },
      coupon: {
        type: DataTypes.STRING,
        defaultValue: "",
        allowNull: true,
      },
      activatedAt: {
        type: DataTypes.STRING,
        defaultValue: "",
        allowNull: true,
      },
      nextBillingAt: {
        type: DataTypes.STRING,
        defaultValue: "",
        allowNull: true,
      },
      status: {
        type: DataTypes.STRING,
        defaultValue: "",
        allowNull: true,
      },
      failed_reason: {
        type: DataTypes.STRING,
        defaultValue: "",
        allowNull: true,
      },
      type: {
        type: DataTypes.STRING,
        defaultValue: "",
        allowNull: true,
      },
      sub_type: {
        type: DataTypes.STRING,
        defaultValue: "",
        allowNull: true,
      },
      binary_volume: {
        type: DataTypes.STRING,
        defaultValue: "",
        allowNull: true,
      },
      dat: {
        type: DataTypes.STRING,
        defaultValue: "",
        allowNull: true,
      },
      no_crm_group: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      no_stages_group: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      no_friend_request: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      no_crm_message: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      no_ai_comment: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      insta_no_ai_comment: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      advanced_novadata: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: true,
      },
      no_of_birthday_wishes: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0,
      },
    },
    {
      sequelize,
      modelName: "NewPackage",
      tableName: "new_packages",
      timestamps: false,
    }
  );

  return NewPackage;
};
