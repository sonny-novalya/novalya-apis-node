'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class InstaSectionType extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // Define associations if needed
      InstaSectionType.belongsTo(models.InstaSection, {
        foreignKey: 'section_id',
      });
    }
  }
  InstaSectionType.init(
    {
      section_id: DataTypes.INTEGER,
      type: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: 'InstaSectionType',
      timestamps: true,
      tableName: 'insta_section_types', // Make sure it matches the table name in the migration
    });
  return InstaSectionType;
};

