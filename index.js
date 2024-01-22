const version = require('./package.json').version;
const private = process.env.PRIVATE == 'true';

const express = require('express');
const multer = require('multer');
const { rateLimit } = require('express-rate-limit');
const snowflake = require('node-snowflake').Snowflake;
const path = require('path');

const musicManager = require('./classes/musicManager');
const permissions = require('./classes/permissions');
const tokenAuth = require('./classes/tokenAuth');
const userDatabase = require('./classes/userDatabase');
const User = require('./classes/user');

const userDB = new userDatabase(path.isAbsolute(process.env.DB_PATH) ? process.env.DB_PATH : path.join(__dirname, "..", process.env.DB_PATH), 'users.json');
const tempDir = path.join(require('os').tmpdir() + '/music'); 
const upload = multer({ dest: tempDir });

const app = express();
const port = Number(process.env.PORT) || 3000;

// This is used to create the root user if it doesn't exist.
if (userDB.data.length === 0) {

    userDB.data.push({
        id: "0",
        username: 'root',
        permissions: permissions.ROOT,
        blocked: false,
        lastUpdated: Date.now()
    });

    const jwt = tokenAuth.generateToken({
        id: "0",
        username: 'root',
    });

    console.log(`Root token: ${jwt}`);
    console.log(`WARNING: This token is only shown once, and will not be shown again.\nIf you lose this token, you will have to delete the users.json file and restart the server.`);

    userDB.save();
}

/*********************************************************************************************
*                                         Middleware                                         *
**********************************************************************************************/

// This middleware is used to limit the amount of requests per minute.
if (process.env.USE_RATELIMITER == 'true') {
    const limiter = rateLimit({
        windowMs: Number(process.env.RATELIMITER_WINDOW_MS) || 60 * 1000, // 1 minute
        max: Number(process.env.RATELIMITER_MAX_REQUESTS) || 60 // 60 requests
    });
    app.use(limiter);
}

// This middleware checks if the server is private, and if it is, it only allows GET requests.
const checkPrivate = (req, res, next) => {
    if(!req) return;
    if (req.method === "GET") {
        req.auth = false;
        req.user = null;
        return next();
    }

    if (!private) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    req.auth = true;
    next();
};
app.use(checkPrivate);

// This middleware performs token authentication.
const tokenAuthMiddleware = (req, res, next) => {

    if(!req) return;

    if (!req.auth) return next();

    const token = req.get("authorization");

    if (!token) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    const user = tokenAuth.verifyToken(token);
    if (!user) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    req.user = user;

    next();
};
app.use(tokenAuthMiddleware);

/*********************************************************************************************
*                                          Routes                                            *
**********************************************************************************************/

app.get('/', (req, res) => {
    res.json({ private : private, songs : musicManager.getSongsNumber(), version : version });
});

app.get('/songs', (req, res) => {
    const songsWithoutPath = musicManager.songs.map(song => {
        const { path, ...songWithoutPath } = song;
        return songWithoutPath;
    });
    res.json(songsWithoutPath);
});

app.get('/song/:hash', (req, res) => {
    const song = musicManager.songs.find(s => s.hash === req.params.hash);
    if (!song) return res.status(404).json({ message: 'Song not found' });
    res.contentType(song.type);
    res.download(song.path);
});

app.delete('/song/:hash', (req, res) => {
    if (!musicManager.getHashes().includes(req.params.hash)) return res.status(404).json({ message: 'Song not found' });
    const user = userDB.data.find(u => u.id === req.user.id) || { permissions: 0 };
    if (permissions.hasPermission(user, permissions.DELETE) === false) return res.status(403).json({ message: 'Forbidden' });
    musicManager.removeSong(req.params.hash);
    res.json({ message: 'Song deleted' });
});

app.post('/song', upload.single('song'),(req, res) => {
    const user = userDB.data.find(u => u.id === req.user.id) || { permissions: 0 };
    if (permissions.hasPermission(user, permissions.SEND) === false) return res.status(403).json({ message: 'Forbidden' });
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    
    if (!musicManager.addSong(req.file.path)) return res.status(400).json({ message: 'Invalid file' });

    res.json({ message: 'Song added' });
});

app.get('/users', (req, res) => {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
    const user = userDB.data.find(u => u.id === req.user.id) || { permissions: 0 };
    if (permissions.hasPermission(user, permissions.ADDUSER) === false) return res.status(403).json({ message: 'Forbidden' });
    res.json(userDB.data);
});

app.post('/user', (req, res) => {
    const user = userDB.data.find(u => u.id === req.user.id) || { permissions: 0 };
    if (permissions.hasPermission(user, permissions.ADDUSER) === false) return res.status(403).json({ message: 'Forbidden' });
    if (!req.body.username) return res.status(400).json({ message: 'No username provided' });
    if (!req.body.permissions) req.body.permissions = 0;
    if (userDB.data.find(u => u.username === req.body.username)) return res.status(400).json({ message: 'Username already exists' });

    if ( permissions.isHigher(user, req.body.permissions) ) return res.status(400).json({ message: 'Invalid permission' });

    const newUser = new User(req.body.username, req.body.permissions);
    userDB.data.push(newUser);
    userDB.save();
    res.json(newUser);
});

app.delete('/user/:id', (req, res) => {
    const user = userDB.data.find(u => u.id === req.user.id) || { permissions: 0 };
    if (permissions.hasPermission(user, permissions.REMOVEUSER) === false) return res.status(403).json({ message: 'Forbidden' });
    const userToDelete = userDB.data.find(u => u.id === req.params.id);
    if (!userToDelete) return res.status(404).json({ message: 'User not found' });
    if (permissions.isHigher(user, userToDelete.permissions) || permissions.hasPermission(userToDelete, permissions.ROOT)) return res.status(400).json({ message: 'You cannot delete a user with higher permissions than you!' });
    if (req.params.id === req.user.id) return res.status(400).json({ message: 'You cannot delete yourself' });
    userDB.data = userDB.data.filter(u => u.id !== req.params.id);
    userDB.save();
    res.json({ message: 'User deleted' });
});

// This middleware is for handling errors.
app.use((err, req, res, next) => {
    console.error(err.stack)
    res.status(500).json({message: 'Internal server error'});
  })

app.listen(port, () => {
    console.log(`BoomboxServer listening at http://localhost:${port}`);
});