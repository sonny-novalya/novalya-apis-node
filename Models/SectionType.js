'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class SectionType extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // Define associations if needed
      SectionType.belongsTo(models.Section, {
        foreignKey: 'section_id',
      });
    }
  }
  SectionType.init(
    {
      section_id: DataTypes.INTEGER,
      type: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: 'section_types',
      timestamps: true,
      tableName: 'section_types', // Make sure it matches the table name in the migration
    });
  return SectionType;
};

