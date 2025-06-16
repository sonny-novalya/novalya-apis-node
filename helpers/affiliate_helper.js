const { Qry } = require("./functions");

const insert_affiliate_commission = async (
  user_id,
  plan_id,
  sponsor_id,
  full_amount,
  amount,
  currency = "USD",
  type = "addition"
) => {
  try {
    sponsor_id = sponsor_id && sponsor_id !== 0 ? sponsor_id : 1;

    const query = `
      INSERT INTO affiliate_comission (
        user_id, plan_id, sponsor_id, full_amount, amount,
        calculation_status, currency, type
      ) VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)
      ON DUPLICATE KEY UPDATE
        full_amount = VALUES(full_amount),
        amount = VALUES(amount),
        currency = VALUES(currency),
        updated_at = CURRENT_TIMESTAMP
    `;

    const result = await Qry(query, [
      user_id,
      plan_id,
      sponsor_id,
      full_amount,
      amount,
      currency,
      type
    ]);

    return result;
  } catch (error) {
    console.error("Error inserting/updating affiliate commission:", error.message);
    throw error;
  }
};

module.exports = {
  insert_affiliate_commission,
};