'use strict';
const {Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {

    class Reseller extends Model {
        /**
         * Helper method for defining associations.
         * This method is not a part of Sequelize lifecycle.
         * The `models/index` file will call this method automatically.
         */
        static associate(models) {
            // define association here
        }
    }

    Reseller.init({
        company_name: {
            type: DataTypes.STRING(255),
            allowNull: false,
        },
        first_name: {
            type: DataTypes.STRING(24),
            allowNull: false,
        },
        last_name: {
            type: DataTypes.STRING(24),
        },
        email: {
            type: DataTypes.STRING(55),
            allowNull: false,
        },
        username: {
            type: DataTypes.STRING(55),
            allowNull: false,
        },
        password: {
            type: DataTypes.STRING(255),
            allowNull: false,
        },
        phone: {
            type: DataTypes.STRING(20),
            allowNull: false,
        },
        company_address: {
            type: DataTypes.STRING(255),
            allowNull: false,
        },
        
        created_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
        },
        updated_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
        },
        
        status: {
            type: DataTypes.INTEGER
        },
        is_delete: {
            type: DataTypes.INTEGER
        },
       
    }, {
        sequelize,
        modelName: 'Reseller',
        tableName: 'resellers',
        timestamps: false
    });
    return Reseller;
};
