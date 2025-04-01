const express = require('express');
const app = express();
const multer = require('multer');
const path = require('path');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const crypto = require('crypto-js');
const fs = require('fs');
const {CleanHTMLData, CleanDBData } = require('../../config/database/connection')
const transporter = require('../../config/mail/mailconfig')
require('dotenv').config();
const encryptionKey = process.env.KEY
const { Qry,checkAuthorization, randomToken, authMiddleware } = require('../../helpers/functions');
const GroupController = require('../../controllers/admin_apis/group');
const secretKey = process.env.jwtSecretKey;

const backoffice_link = 'https://novalyabackend.threearrowstech.com/';
const weblink = 'https://dashboard.novalya.com/';
const emailImagesLink = 'https://threearrowstech.com/projects/gdsg/public/images/email-images/';
const noreply_email = 'noreply@threearrowstech.com';
const company_name = 'Novalya';

// Create a multer middleware for handling the file upload  
const upload = multer();

router.post('/fetch-group', authMiddleware, GroupController.fetchGroup);
router.post('/edit-group', authMiddleware, GroupController.edithGroup);
router.post('/segment-message');


// Add more routes as needed

module.exports = router;
