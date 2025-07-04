'use strict';
const express = require('express');
require('dotenv').config();
var logger = require('morgan');

const bodyParser = require('body-parser');
const apiRoutes = require('./routes/userroutes');
const adminApiRoutes = require('./routes/adminroutes');
const extensionRoutes = require('./routes/extensionroutes');
const adminRoutes = require('./routes/admin/reseller');
const groupRouter = require('./routes/groupRouter');
const instagramGroupRouter = require('./routes/instagramGroupRouter');
const keywordRouter = require('./routes/keywordRouter');
const instagramKeywordRouter = require('./routes/instagramKeywordRouter');
const sectionRouter = require('./routes/sectionRouter');
const instaSectionRouter = require('./routes/instaSectionRouter');
const novadata = require('./routes/novadata');
const userlimit = require('./routes/userlimit');
const userPlan = require('./routes/userPlanRouter');
const facebookRoutes = require('./routes/facebookRoutes');
const instgramRoutes = require('./routes/instgramRoutes');
const instagramCompaignRouter = require('./routes/instagramCompaignRouter');

const messageRouter = require('./routes/messageRouter');
const instagramMessageRouter = require('./routes/instagramMessageRouter');

const targetSettingRouter = require("./routes/targetSettingRouter");
const instagramTargetSettingRouter = require("./routes/instagramTargetSettingRouter");
const prospectRouter = require('./routes/prospect');
const commentAi = require('./routes/commentai');
const prospectInstagramRouter = require('./routes/prospectInstagramRoutes');

const stageRouter = require('./routes/stageRouter');
const genterCountryRouter = require('./routes/genterCountryRouter');
const instagramStageRouter = require('./routes/instagramStageRouter');

const sendRequestMessageRoutes = require('./routes/sendRequestMessageRoutes');
const birthdaySettingRouter = require('./routes/birthdaySettingRouter');

const statisticsRouter = require('./routes/statistics');
const allMessageRouter = require('./routes/allMessageRouter');

//ext api files
var extGroupRouter = require('./routes/ext/group');

//folder Routes
var foldersRouter = require("./routes/foldersRouter");


const session = require('express-session');
const cookieParser = require('cookie-parser');
const swaggerUi = require("swagger-ui-express");
const YAML = require("yamljs");

const cors = require('cors');
const path = require('path');
const port = process.env.PORT || 8000;
const app = express()
app.use(logger('dev'));
const encryptionKey = process.env.KEY

const corsOptions = {
  origin: ['http://app.novalya.com', 'https://app.novalya.com', 'https://dev.novalya.com', 'https://dev.novalya.com/', 'https://dashboard.novalya.com',
    'https://admin.novalya.com', 'http://localhost:3000', 'http://localhost:3001', 'http://localhost:3005',
    'https://novalyacomplete-kaid.vercel.app', 'https://novalyabackend.novalya.com', 'http://52.202.131.181:3000',
    'http://52.202.131.181:3001', 'https://chroex.novalya.com', 'https://stagingapp.novalya.com',
    'https://stagingbackend.novalya.com', 'https://stagingadmin.novalya.com', 'https://staging-app.novalya.com',
    'https://admin-chroex.novalya.com', 'https://micheldestruel.novalya.com', 'https://admin-micheldestruel.novalya.com',
    'http://app.localhost:3001', 'http://micheldestruel.localhost:3001', 'http://lyriange.localhost:3001',
    'http://staging-app.localhost:3001', 'https://lyriange.novalya.com', 'https://admin-lyriange.novalya.com',
    'http://lyriange.novalya.com', 'http://admin-lyriange.novalya.com', 
    'http://wcy-nuskin.novalya.com', 'http://admin-wcy-nuskin.novalya.com', 
    'https://wcy-nuskin.novalya.com', 'https://admin-nuskin.novalya.com', 'http://nuskin.localhost:3000','http://wcy-nuskin.localhost:3000','https://beta.novalya.com'],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With', 'website'],
  credentials: true,
  exposedHeaders: ['Set-Cookie', 'Date', 'ETag']
};

app.use(cookieParser());


app.use(session({
  secret: encryptionKey,
  resave: false,
  saveUninitialized: true,
  cookie: {
    httpOnly: false,
    path: '/',
    secure: false,
    SameSite: "None"
  },
}));



// Load Swagger YAML
try{
  const swaggerDocument = YAML.load(path.join(__dirname, "swagger.yaml"));
  // Serve Swagger docs
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
  
}catch(error){
  console.log("error is: ",error)
}


// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

app.use(cors(corsOptions));
// Parse URL-encoded bodies
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
// Parse JSON bodies 
app.use(bodyParser.json({ limit: '50mb' }));

// Connect routes
app.use('/user/api', apiRoutes);

// Connect routes
app.use('/api/ext', extGroupRouter);

//created : 23-03-24
app.use('/admin/apis', adminRoutes);

app.use('/admin/api', adminApiRoutes);
app.use('/extension/api', extensionRoutes);
app.use('/groups/api', groupRouter);
app.use('/groups/instagram/api', instagramGroupRouter);
app.use('/keywords/api', keywordRouter);
app.use('/instagram/keywords/api', instagramKeywordRouter);
app.use('/section/api', sectionRouter);
app.use('/instagram/section/api', instaSectionRouter);
app.use('/message/api', messageRouter);
app.use('/instagram/message/api', instagramMessageRouter);
app.use('/target/setting/api', targetSettingRouter);
app.use("/instagram/target/setting/api", instagramTargetSettingRouter);
app.use('/prospect/setting/api', prospectRouter);
app.use('/novadata/api', novadata);
app.use('/commentai/api', commentAi);
app.use('/userlimit/api', userlimit);
app.use('/user/plan', userlimit);
app.use('/plan', userPlan);

app.use('/prospect/instagram/setting/api', prospectInstagramRouter);

app.use('/request/message/api', sendRequestMessageRoutes);
app.use('/birthday/setting/api', birthdaySettingRouter);
app.use('/stages/api', stageRouter);
app.use('/gender/country/api', genterCountryRouter);
app.use('/instagram/stages/api', instagramStageRouter);
app.use('/instagram/compaign/api', instagramCompaignRouter);
app.use('/api/instagram', instgramRoutes);
app.use('/api/facebook', facebookRoutes);
app.use("/api/folders", foldersRouter);
app.use('/statistics/api', statisticsRouter);
app.use('/all/messages/api', allMessageRouter);

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
