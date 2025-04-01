'use strict';
const {
    Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class SendRequestMessage extends Model {
        /**
         * Helper method for defining associations.
         * This method is not a part of Sequelize lifecycle.
         * The `models/index` file will call this method automatically.
         */
        static associate(models) {
            SendRequestMessage.belongsTo(models.MessageData, { foreignKey: 'accept_message_id', as: 'accept_message' });
            SendRequestMessage.belongsTo(models.MessageData, { foreignKey: 'reject_message_id', as: 'reject_message' });
            SendRequestMessage.belongsTo(models.Message, { foreignKey: 'accept_message_id', as: 'accept_new_message' });
            SendRequestMessage.belongsTo(models.Message, { foreignKey: 'reject_message_id', as: 'reject_new_message' });
         }
    }
    SendRequestMessage.init({
        user_id: DataTypes.INTEGER,
        received_status: DataTypes.INTEGER,
        reject_status: DataTypes.INTEGER,
        accept_status: DataTypes.INTEGER,
        received_group_id: DataTypes.INTEGER,
        reject_group_id: DataTypes.INTEGER,
        accept_group_id: DataTypes.INTEGER,
        reject_message_id: DataTypes.INTEGER,
        accept_message_id: DataTypes.INTEGER,
        reject_stage_id: DataTypes.INTEGER,
        accept_stage_id: DataTypes.INTEGER,
    }, {
        sequelize,
        tableName: 'send_request_message',
        timestamps: false
    });
    return SendRequestMessage;
};

