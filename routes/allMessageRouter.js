const express = require('express');
const messageController = require('../controllers/messages/allMessageController');
const processOldMessageController = require('../controllers/messages/processOldMessageController');
const { authenticateUser } = require('../middlewares/authMiddleware');

const router = express.Router();

const routes = [
    { method: 'get', path: '/categories', handler: messageController.getAllCategories },
    { method: 'post', path: '/create-categories', handler: messageController.createCategories },
    { method: 'post', path: '/update-categories/:id', handler: messageController.updateCategories },
    { method: 'delete', path: '/delete-categories/:id', handler: messageController.deleteCategories },
    { method: 'get', path: '/messages', handler: messageController.getAllMessages },
    { method: 'post', path: '/messages', handler: messageController.getAllMessages },

    { method: 'post', path: '/get-all-messages', handler: messageController.getAllMessagesOnly },
    { method: 'post', path: '/get-variant-data', handler: messageController.getMessageVariantData },

    { method: 'post', path: '/create-messages', handler: messageController.createMessages },
    { method: 'post', path: '/update-messages/:id', handler: messageController.updateMessage },
    { method: 'delete', path: '/delete-messages/:id', handler: messageController.deleteMessage },
    { method: 'get', path: '/my-message', handler: messageController.getMessageByCategory },
    { method: 'get', path: '/category-message', handler: messageController.getAllMessageByAllCategory },
    { method: "post", path: "/process-old-messages", handler: processOldMessageController.processOldMessages},
    { method: "post", path: "/add-category-to-message", handler: messageController.addCategoryAndMessages},
    { method: "delete", path: "/delete-category-to-message", handler: messageController.deleteCategoryAndMessages},
    { method: "get", path: "/get-template-messages", handler: messageController.getTemplateMessages},
    
    // sachin rana
    { method: "post", path: "/get-templates-data", handler: messageController.getTemplateMessagesData},
    { method: 'post', path: '/create-duplicate-message', handler: messageController.createDuplicateMessages },
    { method: "post", path: "/update-favorite", handler: messageController.setFavoriteMessage},

];

// Loop through the routes and define them using the router
routes.forEach(({ method, path, handler }) => {
    router[method](path, authenticateUser, handler);
});

module.exports = router;
