module.exports = (sequelize, DataTypes) => {
  const instataggeduser = sequelize.define(
    "instataggeduser",
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
      },
      user_id: {
        type: DataTypes.INTEGER,
      },
      stage_id: {
        type: DataTypes.INTEGER,
      },
      insta_name: {
        type: DataTypes.STRING,
      },
      insta_image_id: {
        type: DataTypes.STRING,
      },
      insta_user_id: {
        type: DataTypes.STRING,
      },
      numeric_insta_id: {
        type: DataTypes.STRING,
      },
      profile_pic: {
        type: DataTypes.STRING,
      },
      is_primary: {
        type: DataTypes.INTEGER,
      },
      is_verified_acc: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
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
      thread_id: {
        type: DataTypes.STRING,
      },
    },

    {
      timestamps: true,
    }
  );
  return instataggeduser;
};
