module.exports = (sequelize, DataTypes) => {
  const note = sequelize.define(
    "notes",
    {
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      fb_user_id: {
        type: DataTypes.STRING
      },
      fb_user_e2ee_id: {
        type: DataTypes.STRING
      },
      insta_user_id: {
        type: DataTypes.STRING
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
      socials: {
        type: DataTypes.TEXT
      },
      short_description: {
        type: DataTypes.TEXT,
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
