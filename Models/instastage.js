'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class InstaStage extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  InstaStage.init({
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
  }, {
    sequelize,
    timestamps: true,
    modelName: 'InstaStage',
  });
  return InstaStage;
};