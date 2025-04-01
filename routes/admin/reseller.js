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
const { Qry,checkAuthorization, randomToken, authMiddleware, adminAuthorization, adminAuthorizationNew } = require('../../helpers/functions');
const GroupController = require('../../controllers/admin_apis/group');
const ResellerController = require('../../controllers/admin_apis/reseller');
const secretKey = process.env.jwtSecretKey;


// Create a multer middleware for handling the file upload  
const upload = multer();

router.post('/reseller/get-listing', adminAuthorizationNew, ResellerController.getListing);
router.post('/reseller/add-new', adminAuthorizationNew, ResellerController.addNew);
router.post('/reseller/update-status', adminAuthorizationNew, ResellerController.updateStatus);
router.post('/reseller/get-details', adminAuthorizationNew, ResellerController.getDetails);
router.post('/reseller/update-profile', adminAuthorizationNew, ResellerController.updateProfile);
router.post('/reseller/delete', adminAuthorizationNew, ResellerController.delete);

router.post('/reseller/check-domain-exist', adminAuthorizationNew, ResellerController.checkDomainExist);

module.exports = router;
