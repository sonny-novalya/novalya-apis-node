module.exports = (sequelize, DataTypes) => {
  const group = sequelize.define(
    "tags",
    {
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      class: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      order_num: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      total_user: {
        type: DataTypes.INTEGER,
        default: 0,
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      custom_color: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      randomCode: {
        type: DataTypes.STRING,
      },
    },
    {
      timestamps: true,
    }
  );
  return group;
};
