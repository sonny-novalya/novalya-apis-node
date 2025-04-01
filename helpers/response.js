
exports.resWith202 = (res, msg, data) => {
    return res.status(200).json({
        status: 'success',
        data: data,
        message: msg 
    });
};

exports.resWith201 = (res, msg, data) => {
    return res.status(201).json({
        status: 'success',
        data: data,
        message: msg 
    });
};

exports.resWith203 = (res, data) => {
    return res.status(200).json(data);
};

exports.resWith422 = (res, msg) => {
    return res.status(422).json({ 
        status: 'error',
        message: msg.replace(/\"/g, '')
    });
};

exports.resWith401 = (res, msg, data = null) => {
    return res.status(401).json({ 
        status: 'error',
        message: msg.replace(/\"/g, ''),
        data: data
    });
};

exports.resWith400 = (res, msg) => {
    return res.status(400).json({ 
        status: 'error',
        message: msg.replace(/\"/g, '') 
    });
};


