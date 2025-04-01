'use strict';
const {
    Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class Section extends Model {
        /**
         * Helper method for defining associations.
         * This method is not a part of Sequelize lifecycle.
         * The `models/index` file will call this method automatically.
         */
        static associate(models) {
            Section.hasMany(models.SectionType, {
                foreignKey: 'section_id',
                as: 'sectionTypes', // This alias can be used to access section types
            });
            Section.belongsToMany(models.MessageData, { through: models.MessageSection, foreignKey: 'section_id' });
        }
    }
    Section.init({
        user_id: DataTypes.INTEGER,
        section: DataTypes.TEXT,
        varient: {
            type: DataTypes.JSON, // Store an array of strings
            allowNull: true,
        },
    }, {
        sequelize,
        tableName: 'section',
        modelName: 'Section',
        timestamps: false
    });
    return Section;
};
