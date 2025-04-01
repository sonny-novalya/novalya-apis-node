const winston = require('winston');
const { Qry, checkAuthorization, randomToken, findAvailableSpace } = require('../helpers/functions');

const logger = winston.createLogger({
  // ... other config ...
  transports: []
});

// Function to insert logs into the database
const logToDatabase = (level, message, type, user_id) => {
  // Insert the log data into the 'logs' table
  const insertLogQuery = `INSERT INTO logs (user_id, level, message, type) VALUES (?, ?, ?, ?)`;
  const insertParams = [user_id, level, message, type];
  const insertResult = Qry(insertLogQuery, insertParams);
};

// Log to the database only
logger.add(new winston.transports.Console({
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  level: 'info',
  // This custom function will be called for each logged message
  // and will log to the database
  format: winston.format.printf(({ timestamp, level, message, type, user_id=0 }) => {
    logToDatabase(level, message, type, user_id); // Log to the database
    return `[${timestamp}] ${level}: ${message}`;
  })
}));

module.exports = logger;
