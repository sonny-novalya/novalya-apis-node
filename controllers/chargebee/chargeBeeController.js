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

    // Fetch all invoices from Chargebee
    chargebee.invoice
      .list({
        limit: req.query.limit || 5,
        "sort_by[asc]": "date",
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
          };
        });

        return Response.resWith200(res, "Invoices fetched", invoices);
      });
  } catch (err) {
    console.error("Invoice fetch error:", err);
    return Response.resWith500(res, "Unexpected error");
  }
};

exports.getAllCards = async (req, res) => {
  try {
    const authUser = await checkAuthorization(req, res);
    if (!authUser) return Response.resWith401(res, "Unauthorized");

    const selectUserQuery = `SELECT customerid FROM usersdata where id = ?`;
    const selectUserResult = await Qry(selectUserQuery, [authUser]);

    chargebee.card.retrieve(selectUserResult[0].customerid)
      .request((error, result) => {
        console.error("Chargebee result:", result);
        if (error) {
          console.error("Chargebee error:", error);
          return Response.resWith200(res, "something went wrong");
        }

        var final_response = (result && result.card) ? result.card : [];

        return Response.resWith200(res, "cards fetched", final_response);
      });
  } catch (error) {
    console.error("error:", error);
    return Response.resWith422(res, "Soemthing went wrong");
  }
};

exports.createNewCard = async (req, res) => {
  try {
    const authUser = await checkAuthorization(req, res);
    if (!authUser) return Response.resWith422(res, "Unauthorized");

    const { card_no, cvv, expiry_year, expiry_month } = req.body;

    if(!card_no || !cvv || !expiry_year || !expiry_month){

      return Response.resWith422(res, "field is required");
    }

    var cardData = {
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
