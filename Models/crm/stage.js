module.exports = (sequelize, DataTypes) => {
  const stage = sequelize.define(
    "stages",
    {
      stage_num: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      tag_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: true,
      }
    },
    {
      timestamps: true,
    }
  );
  
  return stage;
};
