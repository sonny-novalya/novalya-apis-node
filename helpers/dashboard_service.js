const { Qry } = require("./functions");

const getConversionRate = async (currency) => {
  const key = currency === "EUR" ? "conversion1" : "conversion";
  const [result] = await Qry("SELECT * FROM setting WHERE keyname = ?", [key]);
  return parseFloat(result?.keyvalue || 1);
};

const getUserCurrency = (userData) => {
  if (userData.bank_account_title) return "EUR";
  if (userData.outside_bank_account_title || userData.wallet_address) return "USD";
  return userData.currency || "USD";
};

const getEarnings = async (userId) => {
  const [[eurResult], [usdResult]] = await Promise.all([
    Qry("SELECT SUM(amount) as total FROM transactions WHERE receiverid = ? AND type = ? AND (currency = ? OR currency = '')", [userId, "Payout", "EUR"]),
    Qry("SELECT SUM(amount) as total FROM transactions WHERE receiverid = ? AND type = ? AND currency = ?", [userId, "Payout", "USD"])
  ]);

  return {
    EUR: parseFloat(eurResult?.total || 0),
    USD: parseFloat(usdResult?.total || 0)
  };
};

const getUnilevelData = async (userCount) => {
  // Get current unilevel
  const [current] = await Qry(
    "SELECT * FROM unilevels WHERE `number_of_users` <= ? ORDER BY `id` DESC LIMIT 1",
    [userCount]
  ) || [];

  // Fallback if no current found
  const currentUnilevel = current || (await Qry("SELECT * FROM unilevels WHERE id = 0"))[0];

  // Get next unilevel (capped at id 6)
  const nextId = Math.min(currentUnilevel.id + 1, 6);
  const [nextUnilevel] = await Qry("SELECT * FROM unilevels WHERE id = ?", [nextId]);

  return { currentUnilevel, nextUnilevel };
};

const calculatePayoutData = async (userCount) => {
  const { currentUnilevel, nextUnilevel } = await getUnilevelData(userCount);

  const currentPayoutPer = {
    l1: currentUnilevel?.level1 ?? 0,
    l2: currentUnilevel?.level2 ?? 0,
  };

  const nextPayoutPer = {
    l1: nextUnilevel?.level1 ?? 0,
    l2: nextUnilevel?.level2 ?? 0,
    numberOfUsers: nextUnilevel?.number_of_users ?? null,
  };

  // Calculate progress percentage
  const currentCount = currentUnilevel?.number_of_users ?? 0;
  const nextCount = nextUnilevel?.number_of_users ?? 0;
  const totalGap = nextCount - currentCount;
  const progress = totalGap > 0 ? ((userCount - currentCount) / totalGap) * 100 : 100;

  const progressPercentage = Math.min(Math.max(progress, 0), 100); // Clamp between 0 and 100

  return { currentPayoutPer, nextPayoutPer, progressPercentage };
};

module.exports = {
  getConversionRate,
  getUserCurrency,
  getEarnings,
  calculatePayoutData
};