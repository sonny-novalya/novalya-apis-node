module.exports = (sequelize, DataTypes) => {
  const crm_section = sequelize.define(
    "crm_section",
    {
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      variants: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      section: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
    }
    // {
    //   timestamps: true,
    // }
  );

  return crm_section;
};
