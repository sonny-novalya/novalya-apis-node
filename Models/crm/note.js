module.exports = (sequelize, DataTypes) => {
  const note = sequelize.define(
    "notes",
    {
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      fb_ig_user_id: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      first_name: {
        type: DataTypes.STRING
      },
      last_name: {
        type: DataTypes.STRING
      },
      email: {
        type: DataTypes.STRING
      },
      phone: {
        type: DataTypes.STRING
      },
      profession: {
        type: DataTypes.STRING
      },
      Socials: {
        type: DataTypes.TEXT
      },
      short_description: {
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
