'use strict';
const {
  Model
} = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ProspectionGrpFolders extends Model {
    static associate(models) {
      // Define associations here if needed
    }
  }
  ProspectionGrpFolders.init({
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    folder_name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    social_type: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    prospect_folder: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    order_num: {
      type: DataTypes.INTEGER,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'ProspectionGrpFolders',
    tableName: 'prospection_grp_folders',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  });
  return ProspectionGrpFolders;
};
