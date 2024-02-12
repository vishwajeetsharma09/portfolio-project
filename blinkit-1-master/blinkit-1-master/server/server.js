const express = require('express');
const session = require('express-session');
const multer = require('multer');
const bcrypt = require('bcrypt');
const path = require('path');
const fs = require('fs');

const { db, closeDatabase } = require('./database');

const app = express();
const port = 3000;

// Connect to SQLite database
db;

// Configure session
app.use(session({
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: true
}));

// Configure multer for file upload
const upload = multer({ dest: 'uploads/' });

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Middleware to check if user is logged in
function requireLogin(req, res, next) {
    if (!req.session.loggedin) {
        return res.status(401).send('Unauthorized');
    }
    next();
}

// Signup endpoint
app.post('/signup', async (req, res) => {
    const { username, password } = req.body;

    try {
        // Check if username already exists
        const existingUser = await getUserByUsername(username);
        if (existingUser) {
            return res.status(400).send('Username already exists');
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert new user into database
        const result = await insertUser(username, hashedPassword);
        res.redirect('/login.html');
    } catch (error) {
        console.error('Error signing up:', error);
        res.status(500).send('Failed to create user');
    }
});

// Login endpoint
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        // Retrieve user from the database by username
        const user = await getUserByUsername(username);
        if (!user) {
            return res.status(401).send('Invalid username or password');
        }

        // Compare the provided password with the hashed password stored in the database
        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            return res.status(401).send('Invalid username or password');
        }

        // Set session variables to indicate user is logged in
        req.session.loggedin = true;
        req.session.username = username;

        // Redirect to the dashboard page after successful login
        res.redirect('/dashboard.html');
    } catch (error) {
        console.error('Error logging in:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Logout endpoint
app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).send('Internal Server Error');
        }
        res.redirect('/');
    });
});

// Image upload endpoint
app.post('/upload', requireLogin, upload.single('image'), (req, res) => {
    // Process the uploaded file
    const tempPath = req.file.path;
    const targetPath = path.join(__dirname, "./uploads/" + req.session.username + "/" + req.file.originalname);

    if (!fs.existsSync(path.dirname(targetPath))) {
        fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    }

    fs.rename(tempPath, targetPath, (err) => {
        if (err) {
            return res.status(500).send('Error uploading file');
        }
        res.json({ username: req.session.username, filename: req.file.originalname });
    });
});

// Serve uploaded images
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Start server
app.listen(port, () => console.log(`App listening at http://localhost:${port}`));

// Database functions
function getUserByUsername(username) {
    return new Promise((resolve, reject) => {
        db.get('SELECT * FROM users WHERE username = ?', [username], (err, row) => {
            if (err) {
                reject(err);
            } else {
                resolve(row);
            }
        });
    });
}

function insertUser(username, password) {
    return new Promise((resolve, reject) => {
        db.run('INSERT INTO users (username, password) VALUES (?, ?)', [username, password], function (err) {
            if (err) {
                reject(err);
            } else {
                resolve({ id: this.lastID });
            }
        });
    });
}

// Close database connection when server is stopped
process.on('SIGINT', () => {
    closeDatabase();
    process.exit();
});
