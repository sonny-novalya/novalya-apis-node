'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  const instagroup = sequelize.define(
    "instatags",
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER
      },
      name: DataTypes.STRING,
      user_id: DataTypes.INTEGER,
      class: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      custom_color: DataTypes.STRING,
      order_num: DataTypes.INTEGER,
      total_user: DataTypes.INTEGER,
      is_primary: DataTypes.INTEGER,
      randomCode: DataTypes.STRING
    },
    {
      timestamps: true,
    }
  );
  return instagroup;
};
