let self = {};
const fs = require("fs");
const axios = require("axios");
self.getGenderCountryOld = async (req, res) => {
  try {
    const { name = null } = req.query;

    fs.readFile("genderCountry.json", "utf8", (err, data) => {
      if (err) {
        res.json({ status: "error", error: err.message });
      }

      const records = JSON.parse(data);

      let filteredRecord = records.find((record) => {
        const recordName = record.name.toLowerCase();
        const queryName = name ? name.toLowerCase() : null;

        return recordName === queryName;
      });

      if (!filteredRecord) {
        filteredRecord = { gender: "other", country: "us" };
      }

      res.json({ status: "success", data: filteredRecord });
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Error fetching stages",
      error: error.message,
    });
  }
};

self.getGenderCountry = async (req, res) => {
  try {
    const { name = null } = req.query;

    const queryName = name ? name.toLowerCase() : null;

    const axios = require("axios");
    let data = "";

    let config = {
      method: "get",
      maxBodyLength: Infinity,
      url: `https://genderapi.io/api/?name=${queryName}&key=66431791a795a0ff1b5548fc`,
      headers: {},
      data: data,
    };

    axios
      .request(config)
      .then((response) => {
        if (!response.data) {
          filteredRecord = {
            gender: "other",
            country: "us",
            countryName: "other",
          };
        } else {
          var gender =
            response.data.gender && response.data.gender != "NA"
              ? response.data.gender
              : "other";
          var countryCode =
            response.data.countryCode && response.data.countryCode != "NA"
              ? response.data.countryCode
              : "other";
          var countryName =
            response.data.country && response.data.country != "NA"
              ? response.data.country
              : "other";

          filteredRecord = {
            gender: gender,
            country: countryName,
            countryName: countryName,
          };
        }
        res.json({ status: "success", data: filteredRecord });
      })
      .catch((error) => {
        res.status(500).json({
          status: "error",
          message: "Error fetching stages",
          error: error.message,
        });
      });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Error fetching stages",
      error: error.message,
    });
  }
};

self.getGenderCountryForMultipleName = async (req, res) => {
  try {
    const { name = null } = req.query;

    if (!Array.isArray(name)) {
      return res
        .status(500)
        .json({ status: "error", message: "Multiple names are only allowed" });
    }

    const axios = require("axios");

    // Build the URL with multiple name[] parameters
    const queryNames = name
      .map((n) => `name[]=${encodeURIComponent(n.toLowerCase())}`)
      .join("&");
    const url = `https://genderapi.io/api/?${queryNames}&key=66431791a795a0ff1b5548fc`;

    let config = {
      method: "get",
      maxBodyLength: Infinity,
      url: url,
      headers: {},
    };

    axios
      .request(config)
      .then((response) => {
        if (!response.data || !Array.isArray(response.data.names)) {
          return res
            .status(500)
            .json({ status: "error", message: "Invalid response from API" });
        }

        const results = response.data.names.map((item) => {
          const gender =
            item.gender && item.gender !== "NA" ? item.gender : "other";
          const countryCode =
            item.country && item.country !== "NA" ? item.country : "other";
          const countryName =
            item.country && item.country !== "NA" ? item.country : "other";
          return { name: item.name, gender, country: countryCode, countryName };
        });

        res.json({ status: "success", data: results });
      })
      .catch((error) => {
        res.status(500).json({
          status: "error",
          message: "Error fetching data",
          error: error.message,
        });
      });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Error processing request",
      error: error.message,
    });
  }
};

module.exports = self;
