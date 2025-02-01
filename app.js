const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bodyParser = require('body-parser');
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcryptjs'); // Import bcrypt for password hashing
const { createObjectCsvStringifier } = require('csv-writer');

dotenv.config(); // Load environment variables

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware (Always before routes)
app.use(express.json());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// 🛑 Move Session Middleware to the Top Before Routes 🛑
app.use(session({
    secret: process.env.SESSION_SECRET || 'Chakrabhai',
    resave: false,
    saveUninitialized: false, // 🛑 Ensures empty sessions aren't saved
    cookie: { secure: false, httpOnly: true } // Secure should be `true` in production with HTTPS
}));

// 🛑 Hash password once at startup instead of every request
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'admin123';
const ADMIN_PASSWORD_HASH = bcrypt.hashSync(ADMIN_PASSWORD, 10);

// 🔒 Middleware for Authentication
function isAuthenticated(req, res, next) {
    if (req.session && req.session.isAuthenticated) {
        return next(); // User is authenticated
    }
    res.status(401).json({ message: 'Unauthorized: Please log in first' });
}

// 🌐 MongoDB Connection
mongoose.connect(process.env.MONGO_URI || 'mongodb+srv://dineshmaranani:Dinesh@register.ch3gj.mongodb.net/?retryWrites=true&w=majority&appName=Register', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log('MongoDB Connected'))
  .catch(err => console.error('MongoDB Connection Error:', err));

// 📜 Define Team Schema
const TeamSchema = new mongoose.Schema({
    leader: {
        name: { type: String, required: true },
        email: { type: String, required: true },
        phone: { type: String, required: true }
    },
    members: [{
        name: { type: String, required: true },
        email: { type: String, required: true },
        phone: { type: String, required: true }
    }]
});

const Team = mongoose.model('Team', TeamSchema);

// 📝 Team Registration Route
app.post('/register-team', async (req, res) => {
    try {
        const { leader, members } = req.body;
        if (!leader || !leader.name || !leader.email || !leader.phone) {
            return res.status(400).json({ message: 'Leader details are required' });
        }
        if (!Array.isArray(members)) {
            return res.status(400).json({ message: 'Members should be an array' });
        }
        const newTeam = new Team({ leader, members });
        await newTeam.save();
        res.status(201).json({ message: 'Team registered successfully!', teamId: newTeam._id });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Team registration failed' });
    }
});

// 🔑 Admin Login Route
app.post('/admin-login', (req, res) => {
    const { username, password } = req.body;
    if (username === ADMIN_USERNAME && bcrypt.compareSync(password, ADMIN_PASSWORD_HASH)) {
        req.session.isAuthenticated = true; // 🛑 Properly store authentication
        res.status(200).json({ message: 'Login successful' });
    } else {
        res.status(401).json({ message: 'Invalid username or password' });
    }
});

// 🔒 Secure Fetch Teams Route (Only Authenticated Users)
app.get('/all-teams', isAuthenticated, async (req, res) => {
    try {
        const teams = await Team.find();
        res.json(teams);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to fetch teams' });
    }
});

// 🔒 Secure Admin Dashboard Route
app.get('/admin.html', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// 🔴 Logout Route (Destroy Session)
app.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error('Logout error:', err);
            return res.status(500).json({ message: 'Logout failed' });
        }
        res.clearCookie('connect.sid', { path: '/' }); // 🛑 Clear session cookie
        return res.status(200).json({ message: 'Logged out successfully' });
    });
});

// 🏠 Home Route
app.get('/', (req, res) => {
    res.send('Hello, Can you hear the Music!');
});

app.get('/export-csv', isAuthenticated, async (req, res) => {
    try {
        const teams = await Team.find();

        // Define CSV header
        const csvStringifier = createObjectCsvStringifier({
            header: [
                { id: 'leaderName', title: 'Leader Name' },
                { id: 'leaderEmail', title: 'Leader Email' },
                { id: 'leaderPhone', title: 'Leader Phone' },
                { id: 'members', title: 'Team Members' }
            ]
        });

        // Format data for CSV
        const csvData = teams.map(team => ({
            leaderName: team.leader.name,
            leaderEmail: team.leader.email,
            leaderPhone: team.leader.phone,
            members: team.members.map(member => `${member.name} (${member.email})`).join('; ') // Separate members with semicolons
        }));

        // Convert to CSV format
        const csvOutput = csvStringifier.getHeaderString() + csvStringifier.stringifyRecords(csvData);

        // Send the CSV file
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=teams.csv');
        res.status(200).send(csvOutput);
    } catch (error) {
        console.error('Error exporting CSV:', error);
        res.status(500).json({ message: 'Failed to export CSV' });
    }
});

// 🎵 Start Server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
