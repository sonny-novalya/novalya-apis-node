const express = require("express");
const { Qry, checkAuthorization 
} = require("../helpers/functions");
const { insert_affiliate_commission } = require("../helpers/affiliate_helper");

const Response = require("../helpers/response");


exports.affiliateKycData = async (req, res) => {
  try {

    const auth_user = await checkAuthorization(req, res);

    if (!auth_user) {

      return Response.resWith422(res, "Invalid auth");
    };

    const user_select_query = `
      SELECT parent_id, isAlreadyCharge, sub_type, plan_period, plan_pkg,
             isChatActive, connection_type, sponsorid, username, randomcode, firstname, lastname,
             email, picture, admin_logo, fav_icon, current_balance, status, mobile, emailstatus,
             address1, company, country, createdat, login_status, lastlogin, lastip, referral_side,
             kyc_status, user_type, customerid, masked_number, bank_account_title, bank_account_country,
             bank_account_iban, bank_account_bic, wallet_address, payout_details_update_request, rank,
             novarank, connect_status, birthday_status, crm_status, unfollow_status,
             outside_bank_account_country, outside_bank_account_title, outside_bank_account_number,
             outside_bank_account_swift_code, outside_bank_account_routing, outside_bank_account_currency,
             website, outside_bank_account_address, outside_bank_account_city,
             outside_bank_account_zip_code, outside_bank_account_street,
             bank_account_address, bank_account_city, bank_account_zip_code,
             outside_payout_country, payout_country, subscription_status, language,
             language_status, currency, trial, trial_status, trial_end
      FROM usersdata WHERE id = ?
    `;
    const [userData] = await Qry(user_select_query, [auth_user]);
   
    const kycReject = await Qry(`SELECT * FROM kyc WHERE userid = ? AND status = ? ORDER BY id DESC LIMIT 1`, [auth_user, "Rejected"]);

    const payout_info = await Qry(`SELECT * FROM payout_information_request WHERE userid = ? AND status = ? ORDER BY id DESC LIMIT 1`, [auth_user, "Rejected"]);

    return Response.resWith202(res, "success", {'user_data': userData, 'kyc_data': kycReject, 'payout_info': payout_info });

  } catch (error) {
    console.error("Error occurred:", error);  
    return Response.resWith422(res, "Something went wrong");
  }
};

exports.refferedUsers = async (req, res) => {
  try {

    const authUser = await checkAuthorization(req, res);
    if (authUser) {
      const selectReferralUsersQuery = `
      SELECT usersdata.*, 
        new_packages.pkg_name, 
        new_packages.amount, 
        new_packages.currency,
        new_packages.cancellation_date,
        new_packages.is_cancellation_scheduled,
        s.email AS sponsor_email,
        CONCAT(s.firstname, ' ', s.lastname) AS sponsor_name,
        l2.email AS l2_sponsor_email,
        CONCAT(l2.firstname, ' ', l2.lastname) AS l2_sponsor_name
      FROM usersdata
          LEFT JOIN new_packages ON usersdata.id = new_packages.userid AND usersdata.plan_pkg = new_packages.pkg_name 
          LEFT JOIN usersdata AS s ON usersdata.sponsorid = s.id
          LEFT JOIN usersdata AS l2 ON usersdata.l2_sponsorid = l2.id
        WHERE (usersdata.sponsorid = ? OR usersdata.l2_sponsorid = ?)
          AND YEAR(usersdata.createdat) = YEAR(now())
          AND MONTH(usersdata.createdat) = MONTH(now())
          AND usersdata.trial_status = 'Active'
          order by usersdata.id desc`;
      const newTrialUser = await Qry(selectReferralUsersQuery, [
        authUser,
        authUser,
      ]);

      const totalReferralCountQuery = `
         SELECT COUNT(*) AS totalCount 
         FROM usersdata 
         WHERE (sponsorid = ? OR l2_sponsorid = ?) 
         AND YEAR(createdat) = YEAR(now()) 
         AND MONTH(createdat) = MONTH(now())`;

      const totalUsersCount = await Qry(totalReferralCountQuery, [
        authUser,
        authUser,
      ]);

      //########################################
      const selectNewCustomerQuery = `
      SELECT usersdata.*, 
        new_packages.pkg_name, 
        new_packages.amount, 
        new_packages.currency,
        new_packages.cancellation_date,
        new_packages.is_cancellation_scheduled,
        s.email AS sponsor_email,
        CONCAT(s.firstname, ' ', s.lastname) AS sponsor_name,
        l2.email AS l2_sponsor_email,
        CONCAT(l2.firstname, ' ', l2.lastname) AS l2_sponsor_name
      FROM usersdata
        JOIN new_packages ON usersdata.id = new_packages.userid
          LEFT JOIN usersdata AS s ON usersdata.sponsorid = s.id
          LEFT JOIN usersdata AS l2 ON usersdata.l2_sponsorid = l2.id
          WHERE (usersdata.sponsorid = ? OR usersdata.l2_sponsorid = ?)
            AND YEAR(usersdata.createdat) = YEAR(now())
            AND MONTH(usersdata.createdat) = MONTH(now())
            AND new_packages.activatedAt < UNIX_TIMESTAMP(NOW() + INTERVAL 14 DAY)
            AND new_packages.status in ('subscription_renewed', 'Active')
            AND usersdata.trial_status = 'Inactive'
            AND new_packages.type != 'distributor'
            order by usersdata.id desc
            `;
      const newCustomer = await Qry(selectNewCustomerQuery, [
        authUser,
        authUser,
      ]);

      //########################################
      const NotPaidCustomerQuery = `
      SELECT usersdata.*, 
        new_packages.pkg_name, 
        new_packages.amount, 
        new_packages.currency,
        new_packages.cancellation_date,
        new_packages.is_cancellation_scheduled,
        s.email AS sponsor_email,
        CONCAT(s.firstname, ' ', s.lastname) AS sponsor_name,
        l2.email AS l2_sponsor_email,
        CONCAT(l2.firstname, ' ', l2.lastname) AS l2_sponsor_name
      FROM usersdata
        JOIN new_packages ON usersdata.id = new_packages.userid
          LEFT JOIN usersdata AS s ON usersdata.sponsorid = s.id
          LEFT JOIN usersdata AS l2 ON usersdata.l2_sponsorid = l2.id
          WHERE (usersdata.sponsorid = ? OR usersdata.l2_sponsorid = ?)
            AND YEAR(FROM_UNIXTIME(new_packages.cancellation_date)) = YEAR(now())
            AND MONTH(FROM_UNIXTIME(new_packages.cancellation_date)) = MONTH(now())
            AND new_packages.status = 'subscription_cancelled'
            order by usersdata.id desc
            `;
      const trialCanceledUsers = await Qry(NotPaidCustomerQuery, [
        authUser,
        authUser,
      ]);

      const paymentFailedCustomerQuery = `
      SELECT usersdata.*, 
        new_packages.pkg_name, 
        new_packages.amount, 
        new_packages.currency,
        new_packages.cancellation_date,
        new_packages.is_cancellation_scheduled,
        s.email AS sponsor_email,
        CONCAT(s.firstname, ' ', s.lastname) AS sponsor_name,
        l2.email AS l2_sponsor_email,
        CONCAT(l2.firstname, ' ', l2.lastname) AS l2_sponsor_name
      FROM usersdata
        JOIN new_packages ON usersdata.id = new_packages.userid
          LEFT JOIN usersdata AS s ON usersdata.sponsorid = s.id
          LEFT JOIN usersdata AS l2 ON usersdata.l2_sponsorid = l2.id
          WHERE (usersdata.sponsorid = ? OR usersdata.l2_sponsorid = ?)
            AND YEAR(usersdata.createdat) = YEAR(now())
            AND MONTH(usersdata.createdat) = MONTH(now())
            AND new_packages.status = 'payment_failed'
            order by usersdata.id desc
            `;
      const paymentFailedCustomer = await Qry(paymentFailedCustomerQuery, [
        authUser,
        authUser,
      ]);

      const cancelScheduledCustomerQuery = `
      SELECT usersdata.*, 
        new_packages.pkg_name, 
        new_packages.amount, 
        new_packages.currency,
        new_packages.cancellation_date,
        new_packages.is_cancellation_scheduled,
        s.email AS sponsor_email,
        CONCAT(s.firstname, ' ', s.lastname) AS sponsor_name,
        l2.email AS l2_sponsor_email,
        CONCAT(l2.firstname, ' ', l2.lastname) AS l2_sponsor_name
      FROM usersdata
        JOIN new_packages ON usersdata.id = new_packages.userid
          LEFT JOIN usersdata AS s ON usersdata.sponsorid = s.id
          LEFT JOIN usersdata AS l2 ON usersdata.l2_sponsorid = l2.id
          WHERE (usersdata.sponsorid = ? OR usersdata.l2_sponsorid = ?)
            AND new_packages.is_cancellation_scheduled = '1'
            AND FROM_UNIXTIME(new_packages.cancellation_date) >= NOW()
            order by usersdata.id desc
            `;
      /*
      AND MONTH(FROM_UNIXTIME(new_packages.cancellation_date)) = MONTH(CURDATE())
      AND YEAR(FROM_UNIXTIME(new_packages.cancellation_date)) = YEAR(CURDATE())
      */
      const cancelScheduledCustomer = await Qry(cancelScheduledCustomerQuery, [
        authUser,
        authUser,
      ]);

      res.status(200).json({
        status: "success",
        data: { refferedUsers: newTrialUser, totalUsersCount, refferedCustomer: newCustomer, trialCanceledUsers, "payment_due": paymentFailedCustomer, cancelScheduledCustomer },
      });
    }
  } catch (e) {
    res.status(500).json({ status: "error", message: e });
  }
};

exports.affiliateCustomers = async (req, res) => {
  try {

    const postData = req.body;
    const month = postData?.month;
    const year = postData?.year;

    const authUser = await checkAuthorization(req, res);
    if (authUser) {

      //new trial customers
      let selectNewTrialUsersQuery = `
      SELECT usersdata.*, 
        new_packages.pkg_name, 
        new_packages.amount, 
        new_packages.currency,
        new_packages.cancellation_date,
        new_packages.is_cancellation_scheduled,
        s.email AS sponsor_email,
        CONCAT(s.firstname, ' ', s.lastname) AS sponsor_name,
        l2.email AS l2_sponsor_email,
        CONCAT(l2.firstname, ' ', l2.lastname) AS l2_sponsor_name
      FROM usersdata
        JOIN new_packages ON usersdata.id = new_packages.userid 
          LEFT JOIN usersdata AS s ON usersdata.sponsorid = s.id
          LEFT JOIN usersdata AS l2 ON usersdata.l2_sponsorid = l2.id
        WHERE (usersdata.sponsorid = ? OR usersdata.l2_sponsorid = ?)
          AND usersdata.createdat >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
          AND usersdata.subscription_status in ('Active','payment_failed', 'subscription_cancelled', 'subscription_reactivated')
          AND usersdata.trial_status = 'Active' and new_packages.pkg_name not in ('Affiliate Fee')`;

      if (month && year) {
        selectNewTrialUsersQuery += `AND MONTH(usersdata.createdat) = ? 
            AND YEAR(usersdata.createdat) = ?`;
      } else {
        selectNewTrialUsersQuery += `AND (? IS NULL OR ? IS NULL)`;
      }

      selectNewTrialUsersQuery += ` ORDER BY usersdata.id DESC`;
      const params1 = month && year ? [authUser, authUser, month, year] : [authUser, authUser, null, null];
      const newTrialUser = await Qry(selectNewTrialUsersQuery, params1);

      //select active customer
      let selectActiveCustomerQuery = `
      SELECT usersdata.*, 
        new_packages.pkg_name, 
        new_packages.amount, 
        new_packages.currency,
        new_packages.cancellation_date,
        new_packages.activatedAt,
        new_packages.nextBillingAt,
        new_packages.is_cancellation_scheduled,
        s.email AS sponsor_email,
        CONCAT(s.firstname, ' ', s.lastname) AS sponsor_name,
        l2.email AS l2_sponsor_email,
        CONCAT(l2.firstname, ' ', l2.lastname) AS l2_sponsor_name
      FROM usersdata
        JOIN new_packages ON usersdata.id = new_packages.userid AND usersdata.subscription_status = new_packages.status
          LEFT JOIN usersdata AS s ON usersdata.sponsorid = s.id
          LEFT JOIN usersdata AS l2 ON usersdata.l2_sponsorid = l2.id
          WHERE (usersdata.sponsorid = ? OR usersdata.l2_sponsorid = ?)
             AND usersdata.subscription_status in ('subscription_renewed', 'Active', 'subscription_changed', 'subscription_created', 'subscription_activated', 'payment_failed', 'subscription_reactivated', 'subscription_resumed')
            AND usersdata.trial_status = 'Inactive' and new_packages.pkg_name not in ('Affiliate Fee')`;

      if (month && year) {
        // selectActiveCustomerQuery += `AND MONTH(usersdata.createdat) = ? AND YEAR(usersdata.createdat) = ?`;
        selectActiveCustomerQuery += `AND usersdata.createdat <= LAST_DAY(STR_TO_DATE(CONCAT(?, '-', ?), '%Y-%m'))`;
      } else {
        selectActiveCustomerQuery += `AND (? IS NULL OR ? IS NULL)`;
      }

      selectActiveCustomerQuery += ` ORDER BY usersdata.id DESC`;
      const params2 = month && year ? [authUser, authUser, year, month] : [authUser, authUser, null, null];
      const activeCustomers = await Qry(selectActiveCustomerQuery, params2);

      // AND YEAR(usersdata.createdat) = YEAR(now())
      // AND usersdata.createdat >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)


      //trial cancelled user
      let trialCancelledCustomerQuery = `
      SELECT usersdata.*, 
        new_packages.pkg_name, 
        new_packages.amount, 
        new_packages.currency,
        new_packages.cancellation_date,
        new_packages.is_cancellation_scheduled,
        s.email AS sponsor_email,
        CONCAT(s.firstname, ' ', s.lastname) AS sponsor_name,
        l2.email AS l2_sponsor_email,
        CONCAT(l2.firstname, ' ', l2.lastname) AS l2_sponsor_name
      FROM usersdata
        JOIN new_packages ON usersdata.id = new_packages.userid
          LEFT JOIN usersdata AS s ON usersdata.sponsorid = s.id
          LEFT JOIN usersdata AS l2 ON usersdata.l2_sponsorid = l2.id
          WHERE (usersdata.sponsorid = ? OR usersdata.l2_sponsorid = ?)
            AND usersdata.subscription_status = 'subscription_cancelled'
            AND usersdata.trial_status = 'Active'`;

      if (month && year) {
        // trialCancelledCustomerQuery += `AND MONTH(usersdata.createdat) = ? AND YEAR(usersdata.createdat) = ?`;
        // trialCancelledCustomerQuery += `AND new_packages.cancellation_date <= LAST_DAY(STR_TO_DATE(CONCAT(?, '-', ?), '%Y-%m'))`;
        trialCancelledCustomerQuery += `AND YEAR(usersdata.createdat) <= ? AND MONTH(usersdata.createdat) <= ?`;
      } else {
        trialCancelledCustomerQuery += `AND (? IS NULL OR ? IS NULL)`;
      }

      trialCancelledCustomerQuery += ` ORDER BY usersdata.id DESC`;
      const params3 = month && year ? [authUser, authUser, year, month] : [authUser, authUser, null, null];
      const trialCancelledCustomers = await Qry(trialCancelledCustomerQuery, params3);

      // AND YEAR(FROM_UNIXTIME(new_packages.cancellation_date)) = YEAR(now())
      // AND new_packages.cancellation_date >= UNIX_TIMESTAMP(DATE_SUB(CURDATE(), INTERVAL 30 DAY))


      //customer cancelled subscription
      let customerCancelledQuery = `
      SELECT usersdata.*, 
        new_packages.pkg_name, 
        new_packages.amount, 
        new_packages.currency,
        new_packages.cancellation_date,
        new_packages.is_cancellation_scheduled,
        s.email AS sponsor_email,
        CONCAT(s.firstname, ' ', s.lastname) AS sponsor_name,
        l2.email AS l2_sponsor_email,
        CONCAT(l2.firstname, ' ', l2.lastname) AS l2_sponsor_name
      FROM usersdata
        JOIN new_packages ON usersdata.id = new_packages.userid
          LEFT JOIN usersdata AS s ON usersdata.sponsorid = s.id
          LEFT JOIN usersdata AS l2 ON usersdata.l2_sponsorid = l2.id
          WHERE (usersdata.sponsorid = ? OR usersdata.l2_sponsorid = ?)
          AND usersdata.subscription_status in ('subscription_cancelled', 'subscription_paused')
          AND usersdata.trial_status = 'Inactive'`;

      if (month && year) {
        // customerCancelledQuery += `AND MONTH(usersdata.createdat) = ? AND YEAR(usersdata.createdat) = ?`;
        // customerCancelledQuery += `AND new_packages.cancellation_date <= LAST_DAY(STR_TO_DATE(CONCAT(?, '-', ?), '%Y-%m'))`;
        customerCancelledQuery += `AND YEAR(usersdata.createdat) <= ? AND MONTH(usersdata.createdat) <= ?`;
      } else {
        customerCancelledQuery += `AND (? IS NULL OR ? IS NULL)`;
      }

      customerCancelledQuery += ` ORDER BY usersdata.id DESC`;
      const params4 = month && year ? [authUser, authUser, year, month] : [authUser, authUser, null, null];
      const customerCancelledSelect = await Qry(customerCancelledQuery, params4);

      // AND new_packages.cancellation_date >= UNIX_TIMESTAMP(DATE_SUB(CURDATE(), INTERVAL 30 DAY))          
      // AND YEAR(FROM_UNIXTIME(new_packages.cancellation_date)) = YEAR(now())
      // AND MONTH(FROM_UNIXTIME(new_packages.cancellation_date)) = MONTH(now())

      //select active customer
      let selectAllCustomerQuery = `
        SELECT usersdata.*, 
            new_packages.pkg_name, 
            new_packages.amount, 
            new_packages.currency,
            new_packages.cancellation_date,
            new_packages.activatedAt,
            new_packages.nextBillingAt,
            new_packages.is_cancellation_scheduled,
            s.email AS sponsor_email,
            CONCAT(s.firstname, ' ', s.lastname) AS sponsor_name,
            l2.email AS l2_sponsor_email,
            CONCAT(l2.firstname, ' ', l2.lastname) AS l2_sponsor_name
        FROM usersdata
        JOIN new_packages ON usersdata.id = new_packages.userid
        LEFT JOIN usersdata AS s ON usersdata.sponsorid = s.id
        LEFT JOIN usersdata AS l2 ON usersdata.l2_sponsorid = l2.id
        WHERE (usersdata.sponsorid = ? OR usersdata.l2_sponsorid = ?)`;

      if (month && year) {
        // selectAllCustomerQuery += `AND MONTH(usersdata.createdat) = ? AND YEAR(usersdata.createdat) = ?`;
        selectAllCustomerQuery += `AND usersdata.createdat <= LAST_DAY(STR_TO_DATE(CONCAT(?, '-', ?), '%Y-%m'))`;
      } else {
        selectAllCustomerQuery += `AND (? IS NULL OR ? IS NULL)`;
      }

      selectAllCustomerQuery += ` ORDER BY usersdata.id DESC`;

      const params = month && year ? [authUser, authUser, year, month] : [authUser, authUser, null, null];

      const allCustomers = await Qry(selectAllCustomerQuery, params);

      const totalActiveCustomerQuery = `
        SELECT COUNT(*) AS totalCount 
        FROM usersdata 
        WHERE (sponsorid = ? OR l2_sponsorid = ?)
        AND subscription_status NOT IN ('subscription_cancelled', 'payment_failed', 'subscription_paused')`;

      const totalActiveUsersCount = await Qry(totalActiveCustomerQuery, [
        authUser,
        authUser,
      ]);

      return res.status(200).json({
        status: "success",
        data: {
          new_trails: newTrialUser,
          active_customers: activeCustomers,
          trial_cancelled: trialCancelledCustomers,
          customer_cancelled: customerCancelledSelect,
          all_customers: allCustomers,
          totalUsersCount: totalActiveUsersCount,
        },
      });
    }
  } catch (e) {
    return res.status(500).json({ status: "error", message: e });
  }
};

exports.ticketCount = async (req, res) => {
  try {
    const authUser = await checkAuthorization(req, res); // Assuming checkAuthorization function checks the authorization token

    if (authUser) {
      const getTicketQry = `SELECT total_tickets_sold  FROM ticket_count WHERE id = ?`
      const getTicketResult = await Qry(getTicketQry, 1);
      res.json({
        status: "success",
        data: getTicketResult,
      });
    }
  } catch (error) {
    res.json({
      status: "error",
      message: "Server error occurred in query",
    });
  }
};



