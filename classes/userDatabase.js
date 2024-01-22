const fs = require('fs');

const database = require('./database');
const User = require('./user');
const PERMISSIONS = require('./permissions');

module.exports = class UserDatabase extends database {

    constructor(dir, file) {
        super(dir, file);
    }

    read() {
        if (!fs.existsSync(this.path)) {
            fs.mkdirSync(this.dir, { recursive: true });
            fs.writeFileSync(this.path, '[]');
            return [];
        }
        const raw = JSON.parse(fs.readFileSync(this.path, 'utf8'));
        this.data = raw.map(u => new User(u.username, u.permissions, u.id, u.blocked, u.lastUpdated));
        return this.data;
    }

}