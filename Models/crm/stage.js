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

  stage.sync({ alter: true })
  .then(() => {
    console.log('stage created or updated successfully');
  })
  .catch(err => {
    console.error('Error creating or updating stage:', err);
  });
  
  return stage;
};
