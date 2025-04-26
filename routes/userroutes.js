const express = require("express");
const router = express.Router();
const multer = require("multer");

// Create a multer middleware for handling the file upload
const upload = multer({
  limits: {
    fileSize: 10 * 1024 * 1024, // Increase the maximum file size (e.g., 10MB)
    fieldSize: 25 * 1024 * 1024,
  },
});

// Create a new routes : sachin
const UserController = require("../controllers/UserController");

//CRM
const campaignController = require("../controllers/crm/campaign.controller");
const taggedUserController = require("../controllers/crm/taggedusercontroller");
const groupController = require("../controllers/crm/group.controller");
const instagramGroupController = require("../controllers/crm/group.instagram.controller");
const messageController = require("../controllers/crm/message.controller");
const sectionController = require("../controllers/crm/section.controller");
const noteController = require("../controllers/crm/note.controller");
const stageController = require("../controllers/crm/stage.controller");

router.post("/login", UserController.login);
router.post("/manualsignin", UserController.manualSignIn);
router.post("/defaultTagAndMessage", UserController.defaultTagAndMessage);
router.post("/register", UserController.register);
router.post("/loginfromadminsettoken", UserController.loginFromAdminSetToken);
router.post("/forgetpassword", UserController.forgetpassword);
router.post("/resetpassword", UserController.resetpassword);
router.post("/validateemailtoken", UserController.validatEmailToken);
router.post("/verifyemailaccount", UserController.verifyEmailAccount);
router.post("/userdata", UserController.userdata);
router.post("/refferedUsers", UserController.refferedUsers);
router.post("/affiliate-customers", UserController.affiliateCustomers);
router.post("/ticketCount", UserController.ticketCount);
router.post("/singleuserdata", UserController.singleUserData);
router.post("/getmessageslist", UserController.getMessagesList);
router.post("/getsinglemessage", UserController.getSingleMessage);
router.post("/getnotifications", UserController.getNotifications);
router.post("/lastweektransactions", UserController.lastWeekTransactions);
router.post("/updateprofiledata", UserController.updateProfileData);
router.post("/updatepassword", UserController.updatePassword);
router.post("/getsubscriptionitems", UserController.getSubscriptionItems);
router.post("/getupgradesubscriptionitems", UserController.getUpgradeSubscriptionItems);
router.post("/getsingleitem", UserController.getSingleItem);
router.post("/updatesubscription", UserController.updateSubscription);
router.post("/createaffiliateuser", UserController.createAffiliateUser);
router.post("/createportalsession", UserController.createPortalSession);
router.post("/checkcoupon", UserController.checkcoupon);
router.post("/getchargebeecustomer", UserController.getChargebeeCustomer);
router.post("/checkaffiliatehostedpage", UserController.checkaffiliatehostedpage);
router.post("/dashboarddata", UserController.dashboarddata);
router.post("/teamusers", UserController.teamusers);
router.post("/updatelanguage", UserController.updatelanguage);
router.post("/news", UserController.news);
router.post("/singlenews", UserController.singlenews);

router.post("/uploadkycdata", upload.fields([
  { name: "idcardFront", maxCount: 1 },
  { name: "idcardBack", maxCount: 1 },
]), UserController.uploadKycData);

router.post("/binarypointsreport", UserController.binarypointsreport);
router.post("/subscriptionreport", UserController.subscriptionreport);
router.post("/personalreferrals", UserController.personalreferrals);
router.post("/residuelreport", UserController.residuelreport);
router.post("/previuosmonthrecord", UserController.previuosmonthrecord);
router.post("/payout", UserController.payout);
router.post("/updatereferralside", UserController.updatereferralside);
router.post("/updatepayoutdetails", UserController.updatepayoutdetails);
router.post("/payoutupdaterequest", UserController.payoutupdaterequest);
router.post("/binarytree", UserController.binarytree);
router.post("/singleuserbinarytreedata", UserController.singleuserbinarytreedata);
router.post("/eventregistration", UserController.eventregistration);
router.post("/csvupgradelimits", UserController.csvupgradelimits);
router.post("/csvrenewal", UserController.csvrenewal);
router.post("/csv3", UserController.csv3);
router.post("/csv4", UserController.csv4);
router.post("/cronjobduplicateentries", UserController.cronjobduplicateentries);
router.post("/cronjobautocoupon", UserController.cronjobautocoupon);
router.post("/cronjobnovarank", UserController.cronjobnovarank);
router.post("/cronjobrank", UserController.cronjobrank);
router.post("/binarybonuspreviousmonthrank", UserController.binarybonuspreviousmonthrank);
router.post("/cronjobpreviousmonth", UserController.cronjobpreviousmonth);
router.post("/cronjobbinarybonus", UserController.cronjobbinarybonus);
router.post("/cronjobyearlypoints", UserController.cronjobyearlypoints);
router.post("/insertolddata", UserController.insertolddata);
router.post("/registrationissue11", UserController.registrationissue11);

router.post("/ipn", UserController.ipnChagrbeWebhook);

router.post("/solvedyearlypoints", UserController.solvedyearlypoints);

router.get("/compaigns/user", campaignController.userdata);

router.post("/compaigns", campaignController.placecampaign).get("/compaigns", campaignController.getAll);

router.get("/compaigns/:id", campaignController.getOne)
  .patch("/compaigns/:id", campaignController.updateOne)
  .delete("/compaigns/:id", campaignController.deleteOne);

// CRM
router.post("/group", groupController.placetag);
router.post("/facebook/get-all-groups", groupController.getAll);
router.post("/reorderGroup", groupController.reorderGroup);

router
  .get("/group/:id", groupController.getOne)
  .patch("/group/:id", groupController.updateOne)
  .delete("/group/:id", groupController.deleteOne);

// tags instagram
// .get("/instagram/group", instagramGroupController.getAll)   previous API
router
  .post("/instagram/group", instagramGroupController.placetag)
  .post("/instagram/get-all-groups", instagramGroupController.getAll)
  .get("/instagram/users", instagramGroupController.getAllUsers)

  .post("/instagram/reorderGroup", instagramGroupController.reorderGroup);
router
  .get("/instagram/group/:id", instagramGroupController.getOne)
  .patch("/instagram/group/:id", instagramGroupController.updateOne)
  .delete("/instagram/group/:id", instagramGroupController.deleteOne);

// tagged User
router.post("/taggeduser/", taggedUserController.placetaggedUsers);
router.post("/get-all-tagged-users", taggedUserController.getAll);

router.patch("/taggeduser/multiple/", taggedUserController.updateMultiple);

router
  .get("/taggeduser/:id", taggedUserController.getOne)
  .patch("/taggeduser/:id", taggedUserController.updateOne)
  .delete("/taggeduser/:id", taggedUserController.deleteOne);
  
router.patch("/taggedusersmove/", taggedUserController.taggedusersmove);
router.patch("/changeUserTagGroup/", taggedUserController.changeUserTagGroup);
router.get("/taggeduserimport/", taggedUserController.importTaggedUsers);

// message
router
  .post("/message/", messageController.placeMessage)
  .get("/message/", messageController.getAll);
router
  .get("/message/:id", messageController.getOne)
  .patch("/message/:id", messageController.updateOne)
  .delete("/message/:id", messageController.deleteOne);

// sections
router
  .post("/section/", sectionController.placeSection)
  .get("/section/", sectionController.getAll);
router
  .get("/section/:id", sectionController.getOne)
  .patch("/section/:id", sectionController.updateOne)
  .delete("/section/:id", sectionController.deleteOne);

// note
router.post("/note/", noteController.placeNote);
router.post("/get-all-note", noteController.getAll);

router
  .get("/note/:id", noteController.getOne)
  .get("/note/tagged_user/:fb_user_id", noteController.getByUser)
  .patch("/note/:id", noteController.updateOne)
  .delete("/note/:id", noteController.deleteOne);

//stages
router.get("/stage/", stageController.getAll);
router.post("/updateStages/", stageController.updateDbStages);
router.post("/updateDbInstaStages/", stageController.updateDbInstaStages);



router.post("/yearlyPointsMigration", UserController.yearlyPointsMigration);
router.post("/cronjobrankforoctober", UserController.cronjobrankforoctober);
router.post("/cronjobnovarankforoctober", UserController.cronjobnovarankforoctober);
router.post("/binarybonuspreviousmonthrankforoctober", UserController.binarybonuspreviousmonthrankforoctober);
router.post("/cronjobautocouponcsv", UserController.cronjobautocouponcsv);
router.post("/cronjobwithdrawalstatus", UserController.cronjobwithdrawalstatus);
router.post("/cronjobbalancetransfer", UserController.cronjobbalancetransfer);
router.post("/cronjobpendingpool", UserController.cronjobpendingpool);
router.post("/cronjobpoolone", UserController.cronjobpoolone);
router.post("/cronjobpoolthreee", UserController.cronjobpoolthreee);
router.post("/getpayoutinformationrequest", UserController.getpayoutinformationrequest);
router.post("/openunfollow", UserController.openunfollow);
router.post("/anuualdatetest", UserController.anuualdatetest);
router.post("/openusers", UserController.openusers);
router.post("/openusers1", UserController.openusers1);
router.post("/getpoolreports", UserController.getpoolreports);
router.post("/getunilevelreports", UserController.getunilevelreports);
router.post("/getpooldistributionreports", UserController.getpooldistributionreports);
router.post("/getlevelbonusdedcuted", UserController.getlevelbonusdedcuted);
router.post("/updateaffiliatecode", UserController.updateaffiliatecode);
router.post("/level1count", UserController.level1count);
router.post("/setduplicatecommission", UserController.setduplicatecommission);
router.post("/testTransa", UserController.testTransa);
router.post("/setlastmonthcommission", UserController.setlastmonthcommission);
router.post("/setlevel2", UserController.setlevel2);
router.post("/setplanamount", UserController.setplanamount);
router.post("/insertlevel2foradd", UserController.insertlevel2foradd);
router.post("/insertlevel2fordeduct1", UserController.insertlevel2fordeduct1);
router.post("/insertlevel2fordeduct2", UserController.insertlevel2fordeduct2);
router.post("/insertlevel2fordeduct3", UserController.insertlevel2fordeduct3);
router.post("/setjan28to31", UserController.setjan28to31);
router.post("/setlastoverall", UserController.setlastoverall);
router.post("/setfebpending", UserController.setfebpending);
router.post("/cronjobbalancetransfersingleuser", UserController.cronjobbalancetransfersingleuser);
router.post("/setcommission", UserController.setcommission);
router.post("/affiliateslifetimeearning", UserController.affiliateslifetimeearning);
router.post("/setpaidamount", UserController.setpaidamount);
router.post("/getunilevelreports111", UserController.getunilevelreports111);
router.post("/charge", UserController.charge);

router.post("/setlimits2222", UserController.setlimits2222);
router.post("/getplansbyfamilyid", UserController.getplansbyfamilyid);
router.post("/get-reseller-plans", UserController.getResellerPlans);
router.post("/testgetitems", UserController.testgetitems);
router.post("/cancelsubscription", UserController.cancelsubscription);
router.post("/settrialrenewal", UserController.settrialrenewal);
router.post("/getsubscriptionitemsupgrade", UserController.getsubscriptionitemsupgrade);
router.post("/checkupgradehostedpage", UserController.checkupgradehostedpage);
router.post("/upload-image-to-s3-bucket", UserController.uploadImageToS3Bucket);
router.post("/set-l2-sponsor-id", UserController.setL2SponsorId);
router.post("/chargeBeeDatta", UserController.chargeBeeDatta);
router.get("/cronjob_affiliate_calculation", UserController.cronjobAffiliateCalculation);

module.exports = router;