'use strict';
const {
    Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class InstaGroup extends Model {
        /**
         * Helper method for defining associations.
         * This method is not a part of Sequelize lifecycle.
         * The `models/index` file will call this method automatically.
         */
        static associate(models) {
            // InstaGroup.hasMany(models.TargetFriendSettings, {
            //     foreignKey: 'group_id',
            //     as: 'groups', // This alias can be used to access section types
            // });
        }
    }
    InstaGroup.init({
        id: {
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
            type: DataTypes.INTEGER
        },
        name: {
            type: DataTypes.TEXT,
        },
        user_id: {
            type: DataTypes.INTEGER,
        },
        order: {
            type: DataTypes.INTEGER,
        },
        type: {
            type: DataTypes.TEXT,
        },
        total_member: {
            type: DataTypes.TEXT,
        },
        group_type: {
            type: DataTypes.TEXT,
        },
        url: {
            type: DataTypes.TEXT,
        },
        created_at: {
            type: DataTypes.DATE,
        },
        updated_at: {
            type: DataTypes.DATE,
        },
    }, {
        sequelize,
        modelName: 'InstaGroup',
        tableName: 'instagroups',
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        timestamps: true
    });
    return InstaGroup;
};
