// authMiddleware.js

const { checkAuthorization, authMiddleware } = require('../helpers/functions');

const authenticateUser = async (req, res, next) => {
    try {
        const authUser = await checkAuthorization(req, res);

        if (!authUser) {
            return res.status(401).json({ status: 'error', message: 'Unauthorized' });
        }

        req.authUser = authUser; // Attach the authenticated user to the request object
        next();

    } catch (error) {

    }
};

const checkAuthUser = async (req, res, next) => {
    try {
        const authUser = await authMiddleware(req, res);

        if (!authUser) {
            return res.status(401).json({ status: 'error', message: 'Unauthorized' });
        }

        req.user = authUser; // Attach the authenticated user to the request object
        next();

    } catch (error) {

    }
};

module.exports = { authenticateUser, checkAuthUser };
