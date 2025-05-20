module.exports = (sequelize, DataTypes) => {
  const taggedUser = sequelize.define(
    "taggedusers",
    {
      user_id: {
        type: DataTypes.INTEGER,
      },
      stage_id: {
        type: DataTypes.INTEGER,
      },
      fb_name: {
        type: DataTypes.TEXT
      },
      fb_image_id: {
        type: DataTypes.STRING(500),
      },
      fb_user_id: {
        type: DataTypes.STRING,
        allowNull: true,

      },
      numeric_fb_id: {
        type: DataTypes.STRING,
        allowNull: true,

      },
      profile_pic: {
        type: DataTypes.TEXT,
      },
      is_primary: {
        type: DataTypes.INTEGER,
      },
      user_note: {
        type: DataTypes.TEXT,
      },
      profession: {
        type: DataTypes.TEXT,
      },
      tag_id: {
        type: DataTypes.STRING,
      },
      is_e2ee: {
        type: DataTypes.INTEGER,
      },
      fb_user_e2ee_id:{
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: null,
      }
    },

    {
      timestamps: true,
    }
  );

  // taggedUser.sync({ alter: true })
  // .then(() => {
  //   console.log('User table created or updated successfully');
  // })
  // .catch(err => {
  //   console.error('Error creating or updating User table:', err);
  // });
  return taggedUser;
};
