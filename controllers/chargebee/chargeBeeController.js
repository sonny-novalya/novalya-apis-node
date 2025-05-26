const chargebee = require("chargebee");
const { checkAuthorization,Qry } = require("../../helpers/functions");
const Response = require("../../helpers/response");

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

exports.updateSubscriptionPlanPreserveEverything = async (req, res) =>{
  try {
    const {subscriptionId, newPlanPriceId, currentPrice} = req.body
    console.log(subscriptionId, newPlanPriceId, currentPrice)
       const result = await chargebee.subscription.update(subscriptionId, {
      subscription_items: [
        {
          "item_price_id[is]": newPlanPriceId,
          item_type: "plan",
          quantity: 1,
          "plan_unit_price_in_decimal": currentPrice*100
        }
      ],
      "replace_items_list": true
    }).request();

   

    return Response.resWith202(res,"success",result)
  } catch (error) {
      console.error("Error generating addon checkout link:", error);
     return Response.resWith400(res,error?.message || "something went wrong")
  }
}