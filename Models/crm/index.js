const dbConfig = require("./../../config/database/conn");
const { Sequelize, DataTypes } = require("sequelize");

const sequelize = new Sequelize(dbConfig.DB, dbConfig.USER, dbConfig.PASSWORD, {
  host: dbConfig.HOST,
  dialect: dbConfig.dialect,
  operators: false,
  logging: false,
  pool: {
    max: dbConfig.pool.max,
    min: dbConfig.pool.min,
    acquire: dbConfig.pool.acquire,
    idle: dbConfig.pool.idle,
  },
});

sequelize
  .authenticate()
  .then(() => {})
  .catch((err) => {});

const db = {};

db.Sequelize = Sequelize;
db.sequelize = sequelize;

// Define models

db.tag = require("./group")(sequelize, DataTypes);
db.instatag = require("./instagroup")(sequelize, DataTypes);
db.section = require("./section")(sequelize, DataTypes);
db.messages = require("./message")(sequelize, DataTypes);
db.campaign = require("./campaign")(sequelize, DataTypes);
db.instagramCampaign = require("./instagramCampaign")(sequelize, DataTypes);
db.taggedusers = require("./taguser")(sequelize, DataTypes);
db.instataggedusers = require("./instataggeduser")(sequelize, DataTypes);
db.note = require("./note")(sequelize, DataTypes);
db.stage = require("./stage")(sequelize, DataTypes);
db.instastage = require("./instastage")(sequelize, DataTypes);
db.MessageData = require("../MessageData")(sequelize, DataTypes);
db.MessageDataType = require("../MessageDataType")(sequelize, DataTypes);
db.InstaMessageData = require("../InstaMessageData")(sequelize, DataTypes);
db.Section = require("../Section")(sequelize, DataTypes);
db.InstaSection = require("../InstaSection")(sequelize, DataTypes);
db.MessageSection = require("../MessageSection")(sequelize, DataTypes);
db.InstaMessageSection = require("../InstaMessageSection")(
  sequelize,
  DataTypes
);
db.User = require("../User")(sequelize, DataTypes);
db.Statistic = require("../Statistics")(sequelize, DataTypes);
db.Category = require("../Category")(sequelize, DataTypes);
db.MessageVariant = require("../MessageVariant")(sequelize, DataTypes);
db.Message = require("../Message")(sequelize, DataTypes);

db.CategoryTemplate = require("../CategoryTemplate")(sequelize, DataTypes);
db.MessageVariantTemplate = require("../MessageVariantTemplate")(sequelize, DataTypes);
db.MessageTemplate = require("../MessageTemplate")(sequelize, DataTypes);
db.TemplateFavorite = require("../TemplateFavorite")(sequelize, DataTypes);

// Establish 1 to Many Relation
db.tag.hasMany(db.campaign, { foreignKey: "group_id" }); // Use "tag_id" as the foreign key in campaign
db.instatag.hasMany(db.instagramCampaign, { foreignKey: "group_id" }); // Use "tag_id" as the foreign key in campaign
db.campaign.belongsTo(db.tag, { foreignKey: "group_id" });
db.instagramCampaign.belongsTo(db.instatag, { foreignKey: "group_id" });
db.tag.hasMany(db.stage, { foreignKey: "tag_id", as: "stage" }); // Use "tag_id" as the foreign key in campaign
db.instatag.hasMany(db.instastage, { foreignKey: "tag_id", as: "stage" }); // Use "tag_id" as the foreign key in campaign

db.stage.hasMany(db.taggedusers, { foreignKey: "user_id" }); // Use "tag_id" as the foreign key in campaign
db.stage.belongsTo(db.User, { foreignKey: "user_id", as: "user" }); // Use "tag_id" as the foreign key in campaign
db.stage.belongsTo(db.tag, { foreignKey: "tag_id", as: "tag" }); // Use "tag_id" as the foreign key in campaign

db.instastage.hasMany(db.instataggedusers, { foreignKey: "user_id" }); // Use "tag_id" as the foreign key in campaign
db.instastage.belongsTo(db.User, { foreignKey: "user_id", as: "user" }); // Use "tag_id" as the foreign key in campaign
db.instastage.belongsTo(db.instatag, { foreignKey: "tag_id", as: "tag" }); // Use "tag_id" as the foreign key in campaign

db.taggedusers.belongsTo(db.stage, { foreignKey: "user_id" });
db.instataggedusers.belongsTo(db.instastage, { foreignKey: "user_id" });

db.campaign.belongsTo(db.MessageData, { foreignKey: "message_id" });

db.instagramCampaign.belongsTo(db.MessageData, {
  foreignKey: "message_id",
  as: "MessageDatum",
});

db.campaign.belongsTo(db.Message, {
  foreignKey: "message_id",
  as: "newMessage",
});
db.instagramCampaign.belongsTo(db.Message, {
  foreignKey: "message_id",
  as: "newMessage",
});

db.MessageData.belongsToMany(db.Section, {
  through: db.MessageSection,
  foreignKey: "message_data_id",
});
db.InstaMessageData.belongsToMany(db.InstaSection, {
  through: db.InstaMessageSection,
  foreignKey: "message_data_id",
});
db.Section.belongsToMany(db.MessageData, {
  through: db.MessageSection,
  foreignKey: "section_id",
});
db.InstaSection.belongsToMany(db.InstaMessageData, {
  through: db.InstaMessageSection,
  foreignKey: "section_id",
});

// Call associations
db.Message.associate(db);
db.MessageVariant.associate(db);
db.Category.associate(db);

db.MessageTemplate.associate(db);
db.MessageVariantTemplate.associate(db);
db.CategoryTemplate.associate(db);


// Sync the models with the database
db.sequelize.sync({ force: false }).then(() => {});


module.exports = db;
