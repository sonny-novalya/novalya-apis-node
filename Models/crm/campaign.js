module.exports = (sequelize, DataTypes) => {
  const campaign = sequelize.define(
    "crm_campaigns",
    {
      time_interval: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      group_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      message_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
    },
    {
      timestamps: true,
    }
  );
  return campaign;
};
