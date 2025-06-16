const chargebee = require("chargebee");
const { checkAuthorization,Qry } = require("../../helpers/functions");
const Response = require("../../helpers/response");
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { Terms, nuskinTerms, michelTerms, findPlan, findPlanPeriod, findPlanCurrName } = require("../../utils/chargeBeeSubscriptionChange");

chargebee.configure({
  site: process.env.CHARGEBEE_SITE,
  api_key: process.env.CHARGEBEE_API_KEY,
});

exports.getAllInvoices = async (req, res) => {
  try {
    const authUser = await checkAuthorization(req, res);
    if (!authUser) return Response.resWith401(res, "Unauthorized");

    const selectUserQuery = `SELECT customerid FROM usersdata where id = ?`;
    const selectUserResult = await Qry(selectUserQuery, [authUser]);

    // Fetch all invoices from Chargebee
    chargebee.invoice
      .list({
        limit: req.query.limit || 5,
        "sort_by[asc]": "date",
        "customer_id[is]": selectUserResult[0].customerid
      })
      .request((error, result) => {
        if (error) {
          console.error("Chargebee error:", error);
          return Response.resWith500(res, "Failed to fetch invoices");
        }

        // Extract only required fields from each invoice
        const invoices = result.list.map((item) => {
          const invoice = item.invoice;
          return {
            id: invoice.id,
            customer_id: invoice.customer_id,
            status: invoice.status,
            date: invoice.date,
            total: invoice.total,
            amount_paid: invoice.amount_paid,
            type: invoice.line_items[0].entity_id,
            currency_code: invoice.currency_code,
          };
        });

        return Response.resWith200(res, "Invoices fetched", invoices);
      });
  } catch (err) {
    console.error("Invoice fetch error:", err);
    return Response.resWith500(res, "Unexpected error");
  }
};

exports.downloadInvoice = async(req, res) => {
  try {
    const authUser = await checkAuthorization(req, res);
    if(!authUser) return Response.resWith401(res, "Unauthorized");

    const{ invoice_id } = req.body;
    if(!invoice_id){
      return Response.resWith400(res, "Invoice ID is required");
    }

    chargebee.invoice.pdf(invoice_id).request((error, result) => {
      if (error) {
        console.error("Chargebee PDF error:", error);
        return Response.resWith500(res, "Failed to fetch invoice PDF");
      }

      const downloadUrl = result.download?.download_url;
      return Response.resWith200(res, "Download URL fetched", { download_url: downloadUrl })
    })
  } catch (error) {
    console.error("Invoice PDF fetch error:", err);
    return Response.resWith500(res, "Unexpected error");
  }
}

exports.getAllCards = async (req, res) => {
  try {
    const authUser = await checkAuthorization(req, res);
    if (!authUser) return Response.resWith401(res, "Unauthorized");

    const selectUserQuery = `SELECT customerid FROM usersdata where id = ?`;
    const selectUserResult = await Qry(selectUserQuery, [authUser]);
    const customerId = selectUserResult[0]?.customerid;

    if (!customerId) {
      return Response.resWith422(res, "Customer not found");
    }

    const [customerRes, paymentSourcesRes] = await Promise.all([
      chargebee.customer.retrieve(customerId).request(),  
      chargebee.payment_source.list({ "customer_id[is]": customerId }).request()
    ]);

    const primaryId = customerRes.customer.primary_payment_source_id;
    const cards = paymentSourcesRes.list
      .filter(item => item.payment_source.type === "card")
      .map(item => {
        const ps = item.payment_source;
        return {
          id: ps.id,
          brand: ps.card.brand,
          last4: ps.card.last4,
          expiry_month: ps.card.expiry_month,
          expiry_year: ps.card.expiry_year,
          masked_number: ps.card.masked_number,
          is_primary: ps.id === primaryId
        };
      });

    return Response.resWith200(res, "cards fetched", cards);
  } catch (error) {
    console.error("error:", error);
    return Response.resWith422(res, "Soemthing went wrong");
  }
};

exports.createNewCard = async (req, res) => {
  try {
    const authUser = await checkAuthorization(req, res);
    if (!authUser) return Response.resWith422(res, "Unauthorized");

    const { card_no, cvv, expiry_year, expiry_month, first_name='', last_name='' } = req.body;

    if(!card_no || !cvv || !expiry_year || !expiry_month){

      return Response.resWith422(res, "field is required");
    }

    var cardData = {
        "first_name" : first_name,
        "last_name" : last_name,
        "number" : card_no,
        "cvv" : cvv,
        "expiry_year" : expiry_year,
        "expiry_month" : expiry_month
    };

    const selectUserQuery = `SELECT customerid FROM usersdata where id = ?`;
    const selectUserResult = await Qry(selectUserQuery, [authUser]);

    const result = await chargebee.payment_source.create_card({
      customer_id: selectUserResult[0].customerid,
      card: cardData
    }).request();

    console.error("Chargebee result:", result);
    // const customer = result.customer;
    // const paymentSource = result.payment_source;

    return Response.resWith200(res, "sucess");
  } catch (error) {
    console.error("error:", error);
    return Response.resWith422(res, (error.message) ? error.message : 'Something went wrong');
  }
};

exports.deleteCard = async (req, res) => {
  try {
    const authUser = await checkAuthorization(req, res);
    if (!authUser) return Response.resWith401(res, "Unauthorized");

    const { payment_source_id } = req.body;

    if (!payment_source_id) {
      return Response.resWith422(res, "Payment source ID is required");
    }

    const selectUserQuery = `SELECT customerid FROM usersdata WHERE id = ?`;
    const selectUserResult = await Qry(selectUserQuery, [authUser]);
    const customerId = selectUserResult[0]?.customerid;

    if (!customerId) {
      return Response.resWith422(res, "Customer not found");
    }

    const psResult = await chargebee.payment_source.retrieve(payment_source_id).request();
    if (psResult.payment_source.customer_id !== customerId) {
      return Response.resWith422(res, "This card does not belong to the authorized customer");
    }

    const result = await chargebee.payment_source.delete(payment_source_id).request();

    console.log("Chargebee deletion result:", result);

    return Response.resWith200(res, "Card deleted successfully");
  } catch (error) {
    console.error("Delete card error:", error);
    return Response.resWith422(res, error.message || "Something went wrong");
  }
};

// calling this in userController for userdata
exports.getUserSubscription = async(userid) => {
  try {
    const { list = [] } = await chargebee.subscription.list({
      "customer_id[is]": userid
    }).request();

    if (list.length === 0) {
      return null;
    }

    const subscriptionData = list.map(entry => ({
      subscription_id: entry.subscription?.id,
      next_billing_at: entry.subscription?.next_billing_at
        ? new Date(entry.subscription.next_billing_at * 1000).toISOString()
        : null,
      item_price_id: entry.subscription?.subscription_items?.[0]?.item_price_id || null,
      currency_code: entry.subscription?.currency_code,
      unit_price: entry.subscription?.subscription_items?.[0]?.unit_price || null,
    }));

    return subscriptionData;

  } catch (error) {
    console.error("Get user subscription error:", error);
    return null;
  }
};

exports.subscriptionAddon = async(req,res) => {

    const authUser = await checkAuthorization(req, res);
    if (!authUser) return Response.resWith401(res, "Unauthorized") 
       const { addonId, quantity,subscriptionId }=req.body

    

chargebee.hosted_page.checkout_existing_for_items({
    subscription: {
    id: subscriptionId
  },
  subscription_items: [
    {
      item_price_id: addonId,
      quantity: quantity
    }
  ]
}).request((error, result) => {
  if (error) {
    console.error("Error generating addon checkout link:", error);
     return Response.resWith400(res,error?.message || "something went wrong")
  } else {
    console.log("Addon Checkout URL:", result.hosted_page.url);
    return Response.resWith202(res,"success",result.hosted_page.url)
  }
});

};

exports.updateSubscriptionPlanPreserveEverything = async (req, res) => {
  try {
    const filePath = path.join(__dirname, "../../newSubscriptions.json");
    const rawData = fs.readFileSync(filePath, "utf-8");
    const subscriptions = JSON.parse(rawData);

    if (!Array.isArray(subscriptions) || subscriptions.length === 0) {
      return Response.resWith400(res, "No subscriptions found in Subscriptions.json");
    }

    const results = [];

    for (const sub of subscriptions) {
      // Access properties with exact keys including dots
      const subscriptionId = sub["subscriptions.id"];
      const planId = sub["subscriptions.plan_id"];
      const planUnitPrice = sub["subscriptions.plan_unit_price"];

      if (!subscriptionId || !planId || typeof planUnitPrice !== "number") {
        results.push({
          subscriptionId,
          status: "failed",
          reason: "Missing subscription id, plan_id or plan_unit_price",
        });
        continue;
      }

      let newPriceId = null;

      //For Nuskin
      if (planId.toLowerCase().includes("nuskin")) {
        const period = findPlanPeriod(planId);      // month | year | quater
        const currency = findPlanCurrName(planId);  // USD | EUR

        const nuskinTerm = nuskinTerms.find(
          (t) =>
            Array.isArray(t.old_plan) &&
            t.old_plan.some((old) => planId.includes(old)) &&
            t.period_unit === period &&
            t.currency_code === currency,
        );

        if (!nuskinTerm) {
          results.push({
            subscriptionId,
            status: "skipped",
            reason: "No matching Nuskin term found",
          });
          continue;
        }

        newPriceId = nuskinTerm.plan_id;
      } //for michel plans
      else if (planId.toLowerCase().includes("michel-destruel")) {
        const period = findPlanPeriod(planId);
        const currency = findPlanCurrName(planId);

        const michelTerm = michelTerms.find(
          (t) =>
            t.old_plan === planId &&
            t.period_unit === period &&
            t.currency_code === currency,
        );

        if (!michelTerm) {
          results.push({
            subscriptionId,
            status: "skipped",
            reason: "No matching Michel term found",
          });
          continue;
        }

        newPriceId = michelTerm.plan_id;
      } // Default Novalya other plans
      else {
        const newPlan = findPlan(planId);
        const period = findPlanPeriod(planId);
        const currency = findPlanCurrName(planId);

        if (!newPlan || !period || !currency) {
          results.push({
            subscriptionId,
            status: "skipped",
            reason: "Invalid plan data from utils",
          });
          continue;
        }

        const term = Terms.find(t =>
          Array.isArray(t.old_plan) &&
          t.old_plan.includes(newPlan) &&
          t.period_unit === period &&
          t.currency_code === currency
        );

        if(!term){
          results.push({
            subscriptionId,
            status: "skipped",
            reason: "No matching subscription found in New Plans",
          });
          continue;
        }

        newPriceId = term.plan_id;
        if (!newPriceId) {
          results.push({
            subscriptionId,
            status: "failed",
            reason: "No new price ID found in New Plans",
          });
          continue;
        }
      }

      try {
          // await chargebee.subscription
          //   .update_for_items(subscriptionId, {
          //     subscription_items: [
          //       {
          //         item_price_id: newPriceId,
          //         item_type: "plan",
          //         quantity: 1,
          //         unit_price: planUnitPrice * 100 // in cents
          //       }
          //     ],
          //     replace_items: true
          //   })
          //   .request({
          //     headers: {
          //       "chargebee-notify-customer": "false", // suppress email
          //       "chargebee-event-silent": "true"      // suppress webhooks
          //     }
          //   });


            const site = "novalya"; // e.g. "yourcompany-test"
            const apiKey = "live_GMc7QBUC98cuOnx44QADmkigLQcuMEmrDs";
            const payload = {
              subscription_items: [
                {
                  item_price_id: newPriceId,
                  item_type: "plan",
                  quantity: 1,
                  unit_price: planUnitPrice * 100 // in cents
                }
              ],
              replace_items: true
            };
            await axios.post(`https://${site}.chargebee.com/api/v2/subscriptions/${subscriptionId}/update_for_items`, payload, {
              auth: {
                username: apiKey,
                password: ""
              },
              headers: {
                "chargebee-notify-customer": "false", // suppress emails
                "chargebee-event-silent": "true"      // suppress webhooks
              }
            }).then((res)=>console.log(res.data.subscription));
            
        results.push({
          subscriptionId,
          status: "success",
          new_price_id: newPriceId,
        });
      } catch (err) {
        console.error(`Chargebee error for subscription ${subscriptionId}:`, err.message);
        results.push({
          subscriptionId,
          status: "failed",
          reason: err.message,
        });
      }
    }

    return Response.resWith200(res, "Processed subscriptions", results);
  } catch (error) {
    console.error("Fatal error:", error);
    return Response.resWith500(res, "Failed to process subscriptions");
  }
};