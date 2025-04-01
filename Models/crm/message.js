module.exports = (sequelize, DataTypes) => {
  const message = sequelize.define(
    "messages",
    {
      title: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      message: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      randomcode: {
        type: DataTypes.INTEGER,
      },
    },
    {
      timestamps: false,
    }
  );
  return message;
};
