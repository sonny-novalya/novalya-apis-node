module.exports = (sequelize, DataTypes) => {
    const notesHistory = sequelize.define(
      "notes_history",
      {
        description: {
          type: DataTypes.TEXT
        },
        notes_id: {
          type: DataTypes.INTEGER
        }
      },
      {
        timestamps: true,
        tableName: "notes_history"
      }
    );
    return notesHistory;
  };
  