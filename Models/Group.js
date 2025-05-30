'use strict';
const {
    Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class Group extends Model {
        /**
         * Helper method for defining associations.
         * This method is not a part of Sequelize lifecycle.
         * The `models/index` file will call this method automatically.
         */
        static associate(models) {
            Group.hasMany(models.TargetFriendSettings, {
                foreignKey: 'group_id',
                as: 'groups', // This alias can be used to access section types
            });
        }
    }
    Group.init({
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
        comment_member: {
            type: DataTypes.TEXT,
        },
        group_type: {
            type: DataTypes.TEXT,
        },
        grp_social_type: {
            type: DataTypes.STRING,
        },
        grp_folder_ids: {
            type: DataTypes.TEXT,
        },
        prospection_type: {
            type: DataTypes.TEXT,
        },
        privacy: {
            type: DataTypes.STRING,
        },
        is_verified_acc: {
            type: DataTypes.BOOLEAN,
            default: false,
        },
        url: {
            type: DataTypes.TEXT,
        },
        post_image: {
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
        modelName: 'Groups',
        tableName: 'groups',
        timestamps: false
    });
    return Group;
};
