const db = require("../../Models/crm");
const Statistic = db.Statistic;
const { Op, fn, col, literal } = require("sequelize");
const taggedusers = db.taggedusers;
const instataggedusers = db.instataggedusers;
const moment = require("moment");

exports.createStatistic = async (req, res) => {
  try {
    const { type } = req.body;
    const user_id = req.authUser;
    if (!user_id || !type) {
      return res.status(400).json({ error: "user_id and type are required" });
    }

    // Use the JavaScript Date object directly
    const created_at = new Date();

    // Get the start of today
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0); // Set time to midnight

    // Get the end of today
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999); // Set time to the end of the day

    // Find a record that matches the given user_id, type, and created_at (today's date)
    let statistic = await Statistic.findOne({
      where: {
        user_id: user_id,
        type: type,
        created_at: {
          [Op.between]: [startOfDay, endOfDay],
        },
      },
    });

    if (statistic) {
      // If the record exists for today, increment the message_count by 1
      statistic.message_count += 1;
      await statistic.save();
      return res
        .status(200)
        .json({ message: "Statistic updated successfully", statistic });
    } else {
      // If no record exists for today, create a new one with message_count set to 1
      statistic = await Statistic.create({
        user_id,
        type,
        created_at,
        message_count: 1, // Initialize message_count to 1
      });

      return res
        .status(201)
        .json({ message: "Statistic created successfully", statistic });
    }
  } catch (error) {
    console.error("Error processing statistic:", error);
    return res.status(500).json({ error: "Failed to process statistic" });
  }
};

exports.getStatistics = async (req, res) => {
  try {
    const user_id = req.authUser;
    const type = req.query.type;

    if (!user_id) {
      return res.status(400).json({ error: "user_id is required" });
    }

    const whereClause = {
      user_id: user_id,
    };

    // If type is not 'all', include the type in the where clause
    if (type && type !== "all") {
      whereClause.type = type;
    }

    const statistics = await Statistic.findAll({
      where: whereClause,
    });

    return res.status(200).json({ statistics });
  } catch (error) {
    console.error("Error fetching statistics:", error);
    return res.status(500).json({ error: "Failed to fetch statistics" });
  }
};

exports.getContacts = async (req, res) => {
  try {
    const user_id = req.authUser;
    if (!user_id) {
      return res.status(400).json({ error: "user_id is required" });
    }

    const fbContact = await taggedusers.findAll({
      where: {
        user_id: user_id,
      },
      attributes: [
        [fn("DATE", col("createdAt")), "date"],
        [fn("COUNT", col("id")), "entryCount"],
      ],
      group: [literal("DATE(createdAt)")],
      order: [[literal("DATE(createdAt)"), "ASC"]],
    });

    const instaContact = await instataggedusers.findAll({
      where: {
        user_id: user_id,
      },
      attributes: [
        [fn("DATE", col("createdAt")), "date"],
        [fn("COUNT", col("id")), "entryCount"],
      ],
      group: [literal("DATE(createdAt)")],
      order: [[literal("DATE(createdAt)"), "ASC"]],
    });

    const response = {
      fbContact,
      instaContact,
    };

    return res.status(200).json({ response });
  } catch (error) {
    console.error("Error fetching contacts:", error);
    return res.status(500).json({ error: "Failed to fetch contacts" });
  }
};

exports.getLimits = async (req, res) => {
  try {
    const user_id = req.authUser;
    if (!user_id) {
      return res.status(400).json({ error: "user_id is required" });
    }

    const startOfMonth = moment().startOf("month").toDate();
    const endOfMonth = moment().endOf("month").toDate();

    const statistics = await Statistic.findAll({
      where: {
        user_id: user_id,
        created_at: {
          [Op.between]: [startOfMonth, endOfMonth],
        },
      },
    });

    const fbMessageLimit = statistics.reduce((acc, stat) => {
      if (
        stat.type === "fb_prospection" ||
        stat.type === "birthday" ||
        stat.type === "requests"
      ) {
        acc += stat.message_count;
      }
      return acc;
    }, 0);
    const igMessageLimit = statistics.reduce((acc, stat) => {
      if (stat.type === "ig_prospection") {
        acc += stat.message_count;
      }
      return acc;
    }, 0);

    const tagsLimit = statistics.reduce((acc, stat) => {
      if (stat.type === "fb_crm" || stat.type === "ig_crm") {
        acc += stat.message_count;
      }
      return acc;
    }, 0);

    const aiLimis = statistics.reduce((acc, stat) => {
      if (stat.type === "ig_ai" || stat.type === "fb_ai") {
        acc += stat.message_count;
      }
      return acc;
    }, 0);

    // Fetch Facebook contacts for the current month
    const fbContact = await taggedusers.findAll({
      where: {
        user_id: user_id,
        createdAt: {
          [Op.between]: [startOfMonth, endOfMonth],
        },
      },
      attributes: [[fn("COUNT", col("id")), "entryCount"]],
    });

    // Fetch Instagram contacts for the current month
    const instaContact = await instataggedusers.findAll({
      where: {
        user_id: user_id,
        createdAt: {
          [Op.between]: [startOfMonth, endOfMonth],
        },
      },
      attributes: [[fn("COUNT", col("id")), "entryCount"]],
    });

    // Calculate the total count of both Instagram and Facebook entries
    const totalFbContact = fbContact.length
      ? fbContact[0].get("entryCount")
      : 0;
    const totalInstaContact = instaContact.length
      ? instaContact[0].get("entryCount")
      : 0;
    const totalContactLimit =
      parseInt(totalFbContact) + parseInt(totalInstaContact);

    const response = {
      fbMessageLimit,
      igMessageLimit,
      tagsLimit,
      aiLimis,
      totalContactLimit,
    };

    return res.status(200).json({ response });
  } catch (error) {
    console.error("Error fetching limits:", error);
    return res.status(500).json({ error: "Failed to fetch limits" });
  }
};
