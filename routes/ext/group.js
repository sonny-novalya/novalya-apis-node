const express = require('express');
const router = express.Router();

const { authenticateUser, checkAuthUser } = require('../../middlewares/authMiddleware');

const GroupController = require('../../controllers/ext_apis/Group');
const InstaGroupController = require('../../controllers/ext_apis/InstaGroup');
const ConnectController = require('../../controllers/ext_apis/connect');
const BIrthdayController = require('../../controllers/ext_apis/Birthday');
const FriendController = require('../../controllers/ext_apis/friend');
const CrmController = require('../../controllers/ext_apis/crm');
const TagsController = require('../../controllers/ext_apis/tags');
const InstaTagsController = require('../../controllers/ext_apis/instaTags');
const InstaTagsGroupController = require('../../controllers/ext_apis/instaTagGroups');

router.post('/group/create-group', checkAuthUser, GroupController.createGroup);
router.post(
  "/group/check-group",
  checkAuthUser,
  GroupController.checkGroupByUrl
);
router.post('/group/create-insta-group', checkAuthUser, InstaGroupController.createInstaGroup);
router.post('/connect/update-connect', checkAuthUser, ConnectController.udpateConnect);

//birthday 
router.post('/birthday/get-listing', checkAuthUser, BIrthdayController.getListing);

//friend-request
router.post('/friend/update-request', checkAuthUser, FriendController.updateRequest);

//crm status
router.post('/crm/get-crm-status', checkAuthUser, CrmController.getCrmStatus);
router.post('/crm/get-crm-message-data', checkAuthUser, CrmController.getCrmMessageData);

//tags
router.post('/tag/get-tagged-user', checkAuthUser, TagsController.getTaggedUser);
router.post('/insta/tag/get-tagged-user', checkAuthUser, InstaTagsController.getTaggedUser);
router.post('/tag/get-insta-tagged-user', checkAuthUser, InstaTagsGroupController.getTaggedUser);
router.post('/tag/get-insta-tagged-user/filter', checkAuthUser, InstaTagsGroupController.getFilterTaggedUser);

// new tags endpoints for multiple tagging API
router.post('/tag/get-tagged-user-new', checkAuthUser, TagsController.getTaggedUserNew);

router.post('/tag/update-user-tagged-status', checkAuthUser, TagsController.updateTaggedUserStatus);

// check gender
router.get('/check-gender/:name', GroupController.checkGender);


module.exports = router;
