module.exports = (sequelize, DataTypes) => {
  const note = sequelize.define(
    "notes",
    {
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      fb_user_id: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
      },
      type: {
        type: DataTypes.STRING,
        defaultValue: 'facebook'
      },
    },
    {
      timestamps: true,
    }
  );
  return note;
};
