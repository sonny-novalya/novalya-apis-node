'use strict';
const {
    Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class InstaKeyword extends Model {
        /**
         * Helper method for defining associations.
         * This method is not a part of Sequelize lifecycle.
         * The `models/index` file will call this method automatically.
         */
        // static associate(models) {
        //     Keyword.hasMany(models.TargetFriendSettings, {
        //         foreignKey: 'keyword_id',
        //         as: 'keywords', // This alias can be used to access section types
        //     });
        // }
    }
    InstaKeyword.init({
        name: {
            type: DataTypes.TEXT,
        },
        user_id: {
            type: DataTypes.INTEGER,
        },
        positive_keyword: {
            type: DataTypes.TEXT,
        },
        negative_keyword: {
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
        modelName: 'InstaKeyword',
        tableName: 'insta_keywords',
        timestamps: false
    });
    return InstaKeyword;
};
