const fs = require('fs');

module.exports = class Database {
    
    constructor(path) {
        this.path = path;
        this.data = this.read();
    }

    read() {
        if (!fs.existsSync(this.path)) {
            fs.writeFileSync(this.path, '[]');
            return [];
        }
        this.data = JSON.parse(fs.readFileSync(this.path, 'utf8'));
        return this.data;
    }

    save(data = this.data) {
        if (!fs.existsSync(this.path)) {
            fs.mkdirSync(this.path);
        }
        fs.writeFileSync(this.path, JSON.stringify(data));
    }
}