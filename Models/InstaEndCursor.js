'use strict';
const {
    Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class InstaEndCursor extends Model {
        /**
         * Helper method for defining associations.
         * This method is not a part of Sequelize lifecycle.
         * The `models/index` file will call this method automatically.
         */

    }
    InstaEndCursor.init({
        id: {
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
            type: DataTypes.INTEGER
        },
        user_id: {
            type: DataTypes.INTEGER
        },
        end_cursor: {
            type: DataTypes.STRING
        },
        type: {
            type: DataTypes.STRING
        }
    }, {
        sequelize,
        modelName: 'InstaEndCursor',
        tableName: 'insta_end_cursor',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });
    return InstaEndCursor;
};