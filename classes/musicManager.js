const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const zip = require('adm-zip');
const os = require('os');
const temp = path.join(os.tmpdir(), '/music/');
const uuidv4 = require('uuid').v4;

const database = require('./database');
const dbPath = path.isAbsolute(process.env.DB_PATH) ? process.env.DB_PATH : path.join(__dirname, "..", process.env.DB_PATH);
const MusicDB = new database(dbPath, 'musics.json');

module.exports = class MusicManager {

    static musicDir = process.env.MUSIC_DIR || path.join(__dirname, '../music');

    static addSong(file, name = null, type = null) {
        const extension = name.split('.').pop().toLowerCase();
        if (extension === "zip") {
            this.addZip(file);
            return true;
        };

        if (!fs.existsSync(file)) return false;

        let _type = type;

        if (!_type) {
            switch (extension) {
                case 'mp3':
                    _type = 'audio/mpeg';
                    break;
                case 'wav':
                    _type = 'audio/wav';
                    break;
                case 'ogg':
                    _type = 'audio/ogg';
                    break;
                default:
                    fs.rm(file);
                    return false;
            }
        }

        let fileHash = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

        if (this.getHashes().includes(fileHash)) return false;

        const newFile = {
            name: name || file.split('\\').pop(),
            path: path.join(this.musicDir, `${fileHash}.${extension}`),
            type: _type,
            hash: fileHash
        };

        const tempFile = path.join(temp,`${newFile.hash}.${extension}`);

        fs.renameSync(file, tempFile);
        if(!fs.existsSync(this.musicDir)) fs.mkdirSync(this.musicDir, { recursive: true });
        fs.copyFileSync(tempFile, newFile.path);
        fs.rmSync(tempFile);

        MusicDB.data.push(newFile);
        MusicDB.save();
        return true;
    }

    static addZip(file) {

        const tempDir = path.join(temp, `/${uuidv4()}/`);

        try {
            const zipFile = new zip(file);
            zipFile.extractAllTo(tempDir);
        }  catch (err) {
            console.log(err);
        }

        fs.readdirSync(tempDir).forEach(file => {
            this.addSong(path.join(tempDir, file), file.split('/').pop());
        });

    }

    static removeSong(hash) {
        if (!this.getHashes().includes(hash)) return;

        fs.rmSync(MusicDB.data.find(s => s.hash === hash).path);
        MusicDB.data = MusicDB.data.filter(s => s.hash !== hash);
        MusicDB.save();
    }

    static renameSong(hash, newName) {
        if (!this.getHashes().includes(hash)) return;

        const index = MusicDB.data.indexOf(s => s.hash === hash);
        if (index === -1) return;
        MusicDB.data[index].name = newName;
        MusicDB.save();
    }

    static getSongs() {
        return MusicDB.data;
    }

    static getHashes() {
        return MusicDB.data.map(song => song.hash);
    }

    static getPath(hash) {
        return MusicDB.data.find(s => s.hash === hash).path;
    }

    static getSongsNumber() {
        return MusicDB.data.length;
    }

    static init() {
        fs.readdir(this.musicDir, (err, files) => {
            if (err) throw err;
            files.forEach((file) => {
                const fileSplited = file.split('.'); 
                const hash = fileSplited.splice(0, fileSplited.length - 1);
                if (this.getHashes.contains(hash)) return;
                this.addSong(path.join(this.musicDir, hash));
            })
        })
    }
}