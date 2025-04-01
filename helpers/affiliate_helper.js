const { Qry } = require("./functions");

const insert_affiliate_commission = async (user_id, sponser_id, full_amount, amount, currency = "USD") => {
  try {

    // Ensure sponsor_id is not null or 0, default to 1
    sponser_id = sponser_id && sponser_id !== 0 ? sponser_id : 1;
    const result = await Qry(
      "INSERT INTO affiliate_comission (user_id, sponser_id, full_amount, amount, calculation_status, currency, created_at, updated_at) VALUES (?, ?, ?, ?, 'pending', ?, NOW(), NOW())",
      [user_id, sponser_id, full_amount, amount, currency]
    );
    return result;
  } catch (error) {
    console.error("Error inserting affiliate commission:", error);
    throw error;
  }
};

module.exports = {
  insert_affiliate_commission,
};