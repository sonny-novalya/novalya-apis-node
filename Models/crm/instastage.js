'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  const instastage = sequelize.define(
    "instastages",
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER
      },
      stage_num: DataTypes.INTEGER,
      tag_id: DataTypes.INTEGER,
      user_id: DataTypes.INTEGER,
      name: DataTypes.STRING
    },

    {
      timestamps: true,
      modelName: 'Instastage',
    }
  );
  return instastage;
};
