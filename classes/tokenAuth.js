const jwt = require('jsonwebtoken');

module.exports = class TokenAuth {
    
    static generateToken(data) {
        return jwt.sign(data, process.env.JWT_SECRET);
    }
    
    static verifyToken(token) {
        return jwt.verify(token, process.env.JWT_SECRET);
    }
};