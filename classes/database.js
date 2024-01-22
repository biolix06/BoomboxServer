const fs = require('fs');
const path = require('path');

module.exports = class Database {
    
    constructor(dir, file) {
        this.dir = dir;
        this.file = file;
        this.path = path.join(dir, file);
        this.data = this.read();
    }

    read() {
        if (!fs.existsSync(this.path)) {
            fs.mkdirSync(this.dir, { recursive: true });
            fs.writeFileSync(this.path, '[]');
            return [];
        }
        this.data = JSON.parse(fs.readFileSync(this.path, 'utf8'));
        return this.data;
    }

    save(data = this.data) {
        if (!fs.existsSync(this.path)) {
            fs.mkdirSync(this.dir, { recursive: true });
        }
        fs.writeFileSync(this.path, JSON.stringify(data));
    }
}