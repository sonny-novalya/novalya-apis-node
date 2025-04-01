'use strict';
const {
    Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class InstaSection extends Model {
        /**
         * Helper method for defining associations.
         * This method is not a part of Sequelize lifecycle.
         * The `models/index` file will call this method automatically.
         */
        static associate(models) {
            InstaSection.hasMany(models.InstaSectionType, {
                foreignKey: 'section_id',
                as: 'sectionTypes', // This alias can be used to access section types
            });
            InstaSection.belongsToMany(models.InstaMessageData, { through: models.InstaMessageSection, foreignKey: 'section_id' });
        }
    }
    InstaSection.init({
        user_id: DataTypes.INTEGER,
        section: DataTypes.TEXT,
        varient: {
            type: DataTypes.JSON, // Store an array of strings
            allowNull: true,
        },
    }, {
        sequelize,
        tableName: 'insta_section',
        modelName: 'InstaSection',
        timestamps: false
    });
    return InstaSection;
};
