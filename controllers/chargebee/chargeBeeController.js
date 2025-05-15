const chargebee = require("chargebee");
const { checkAuthorization } = require("../../helpers/functions");
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