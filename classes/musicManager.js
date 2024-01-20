const fs = require('fs');
path = require('path');
const crypto = require('crypto');
const path = require('path');
const zip = require('adm-zip');
const os = require('os');
const temp = os.tmpdir() + '/music/';
const { v4: uuidv4 } = require('uuid');

const database = require('./database');
const MusicDB = new database(path.join(__dirname, '../db/music.json'));

module.exports = class MusicManager {

    static musicDir = process.env.MUSIC_DIR || path.join(__dirname, '../music');

    static addSong(file) {
        const extension = file.split('.').pop().toLowerCase();
        if (extension === "zip") {
            this.addZip(file);
            return true;
        };

        if (!fs.existsSync(file)) return false;

        let _type; 

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

        let fileHash = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

        if (this.getHashes().includes(fileHash)) return false;

        const newFile = {
            name: file.split('/').pop(),
            path: path.join(this.musicDir, `${fileHash}.${extension}`),
            type: _type,
            hash: fileHash
        };

        fs.renameSync(file, `${newFile.hash}.${extension}`);
        fs.copyFileSync(file, newFile.path);
        fs.rmSync(file);

        MusicDB.data.push(newFile);
        MusicDB.save();
        return true;
    }

    static addZip(file) {

        const tempDir = temp + uuidv4();

        try {
            const zipFile = new zip(file);
            zipFile.extractAllTo(tempDir);
        }  catch (err) {
            console.log(err);
        }

        fs.readdirSync(tempDir).forEach(file => {
            this.addSong(path.join(tempDir, file));
        });

    }

    static removeSong(hash) {
        if (!this.getHashes().includes(hash)) return;

        fs.rmSync(MusicDB.data.find(s => s.hash === hash));
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
}