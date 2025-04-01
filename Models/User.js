'use strict';
const {
    Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class User extends Model {
        /**
         * Helper method for defining associations.
         * This method is not a part of Sequelize lifecycle.
         * The `models/index` file will call this method automatically.
         */
        static associate(models) {
            // define association here
        }
    }
    User.init({
        randomcode: {
            type: DataTypes.STRING(10),
            allowNull: false,
        },
        sponsorid: {
            type: DataTypes.STRING(100),
            allowNull: false,
        },
        pname: {
            type: DataTypes.STRING(100),
        },
        leg_position: {
            type: DataTypes.STRING(20),
            allowNull: false,
        },
        username: {
            type: DataTypes.STRING(100),
            allowNull: false,
        },
        firstname: {
            type: DataTypes.STRING(100),
            allowNull: false,
        },
        lastname: {
            type: DataTypes.STRING(100),
            allowNull: false,
        },
        password: {
            type: DataTypes.STRING(300),
            allowNull: false,
        },
        sub_type: {
            type: DataTypes.STRING(100),
            allowNull: false,
            defaultValue: 'None',
        },
        email: {
            type: DataTypes.STRING(100),
            allowNull: false,
        },
        emailstatus: {
            type: DataTypes.STRING(20),
            allowNull: false,
            defaultValue: 'unverified',
        },
        picture: {
            type: DataTypes.STRING(100),
            defaultValue: 'profile.png',
        },
        current_balance: {
            type: DataTypes.FLOAT,
            allowNull: false,
            defaultValue: 0,
        },
        status: {
            type: DataTypes.STRING(10),
            allowNull: false,
            defaultValue: 'Pending',
        },
        loginstatus: {
            type: DataTypes.STRING(10),
            allowNull: false,
            defaultValue: 'unblock',
        },
        mobile: {
            type: DataTypes.STRING(15),
            allowNull: false,
        },
        emailtoken: {
            type: DataTypes.STRING(300),
        },
        country: {
            type: DataTypes.STRING(50),
            allowNull: false,
        },
        createdat: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
        },
        updatedat: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
        },
        login_status: {
            type: DataTypes.STRING(10),
            allowNull: false,
            defaultValue: 'Unblock',
        },
        kyc_status: {
            type: DataTypes.STRING(15),
            allowNull: false,
            defaultValue: 'Unverified',
        },
        rank: {
            type: DataTypes.STRING(11),
            allowNull: false,
            defaultValue: '0',
        },
        user_type: {
            type: DataTypes.STRING(15),
            allowNull: false,
            defaultValue: 'Normal',
        },
        wallet_address: {
            type: DataTypes.STRING(250),
        },
        bank_account_title: {
            type: DataTypes.STRING(250),
        },
        bank_account_country: {
            type: DataTypes.STRING(100),
            allowNull: false,
        },
        bank_account_iban: {
            type: DataTypes.STRING(100),
            allowNull: false,
        },
        bank_account_bic: {
            type: DataTypes.STRING(100),
            allowNull: false,
        },
        referral_side: {
            type: DataTypes.STRING(100),
            allowNull: false,
            defaultValue: 'left',
        },
        withdrawal_status: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        company: {
            type: DataTypes.STRING(100),
            allowNull: false,
        },
        address1: {
            type: DataTypes.STRING(200),
            allowNull: false,
        },
        address2: {
            type: DataTypes.STRING(200),
            allowNull: false,
        },
        zip_code: {
            type: DataTypes.STRING(20),
            allowNull: false,
        },
        city: {
            type: DataTypes.STRING(100),
            allowNull: false,
        },
        masked_number: {
            type: DataTypes.STRING(100),
            allowNull: false,
        },
        left_referral_points: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        right_referral_points: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        total_left_referral_points: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        total_right_referral_points: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        birth_date: {
            type: DataTypes.STRING(100),
            allowNull: false,
        },
        language: {
            type: DataTypes.STRING(100),
            allowNull: false,
            defaultValue: 'en',
        },
        affiliate_agreement: {
            type: DataTypes.STRING(100),
            allowNull: false,
            defaultValue: 'Not Agreed',
        },
        connect_status: {
            type: DataTypes.STRING(10),
            allowNull: false,
            defaultValue: 'On',
        },
        birthday_status: {
            type: DataTypes.STRING(10),
            allowNull: false,
            defaultValue: 'Off',
        },
        crm_status: {
            type: DataTypes.STRING(10),
            allowNull: false,
            defaultValue: 'Off',
        },
        unfollow_status: {
            type: DataTypes.STRING(10),
            allowNull: false,
            defaultValue: 'Off',
        },
        total_direct_active_left_members: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        total_direct_active_right_members: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        upgrade_tab_status: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 1,
        },
        lastlogin: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
        },
        lastip: {
            type: DataTypes.STRING(30),
        },
        usertype: {
            type: DataTypes.STRING(10),
            allowNull: false,
            defaultValue: 'user',
        },
        admin_transaction_password: {
            type: DataTypes.STRING(20),
        },
        allowedroutes: {
            type: DataTypes.STRING(9999),
        },
    }, {
        sequelize,
        modelName: 'User',
        tableName: 'userdata',
        timestamps: false
    });
    return User;
};
