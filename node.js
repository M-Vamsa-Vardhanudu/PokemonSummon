const express = require('express');
const { ObjectId } = require('mongodb');
const { MongoClient } = require('mongodb');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const session = require('express-session');

const app = express();
const PORT = process.env.PORT || 3000;

require('dotenv').config();
// MongoDB connection
const uri = `mongodb+srv://vamsivardhan25:${process.env.DB_PASSWORD}@cluster0.woezb.mongodb.net/pokemonDB?retryWrites=true&w=majority&appName=Cluster0`;
const client = new MongoClient(uri);
let db;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Session middleware
app.use(session({
    secret: 'pokemon-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } // set to true if using HTTPS
}));

// Connect to MongoDB
async function connectDB() {
    try {
        await client.connect();
        console.log("DB connected successfully");
        db = client.db("pokemonDB");
    } catch (error) {
        console.error("DB connection error:", error);
    }
}

connectDB();

// User registration endpoint
app.post('/api/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        // Check if user already exists
        const existingUser = await db.collection('users').findOne({ username });
        if (existingUser) {
            return res.status(400).json({ success: false, message: "Username already exists" });
        }
        
        // Hash password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        
        // Create user
        const userData = {
            username,
            password: hashedPassword,
            createdAt: new Date(),
            coins: 5000,
            buddy: null,
            pokeballs:[
                { type: 'pokeball', count: 10 },
                { type: 'greatball', count: 5 },
                { type: 'ultraball', count: 2 },
                { type: 'masterball', count: 1 }
            ]
        };
        
        const result = await db.collection('users').insertOne(userData);
        
        res.json({ success: true, message: "User registered successfully" });
        
    } catch (error) {
        console.error("Error registering user:", error);
        res.status(500).json({ success: false, error: "Failed to register user" });
    }
});

// User login endpoint
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        // Find user
        const user = await db.collection('users').findOne({ username });
        if (!user) {
            return res.status(400).json({ success: false, message: "User not found" });
        }
        
        // Check password
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(400).json({ success: false, message: "Invalid password" });
        }
        
        // Set session
        req.session.userId = user._id;
        req.session.username = user.username;
        
        res.json({ success: true, message: "Login successful", username: user.username });
        
    } catch (error) {
        console.error("Error logging in:", error);
        res.status(500).json({ success: false, error: "Failed to login" });
    }
});

// Logout endpoint
app.post('/api/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ success: false, error: "Failed to logout" });
        }
        res.json({ success: true, message: "Logout successful" });
    });
});

// Middleware to check if user is authenticated
function requireAuth(req, res, next) {
    if (!req.session.userId) {
        return res.status(401).json({ success: false, message: "Please login first" });
    }
    next();
}

// Modified API endpoint to save Pokemon data with rarity
app.post('/api/save-pokemon', requireAuth, async (req, res) => {
    try {
        const { pokemonName, pokemonImage, pokemonId, pokemonTypes, rarity} = req.body;
        
        const pokemonData = {
            userId: req.session.userId, // Associate Pokemon with user
            name: pokemonName,
            image: pokemonImage,
            id: pokemonId,
            types: pokemonTypes,
            rarity: rarity || 'common', // Include rarity info
            capturedAt: new Date()
        };
        
        const result = await db.collection('pokemonCollection').insertOne(pokemonData);
        
        res.json({ 
            success: true, 
            message: "Pokemon saved successfully",
            insertedId: result.insertedId 
        });
        
    } catch (error) {
        console.error("Error saving Pokemon:", error);
        res.status(500).json({ success: false, error: "Failed to save Pokemon" });
    }
});

// Modified API endpoint to get Pokemon data (now user-specific)
app.get('/api/get-pokemon', requireAuth, async (req, res) => {
    try {
        const userPokemon = await db.collection('pokemonCollection')
            .find({ userId: req.session.userId })
            .toArray();
        res.json(userPokemon);
    } catch (error) {
        console.error("Error fetching Pokemon:", error);
        res.status(500).json({ error: "Failed to fetch Pokemon" });
    }
});

app.get('/api/coins', requireAuth, async (req, res) => {
    try {
        console.log('Session userId:', req.session.userId);

        const user = await db.collection('users').findOne({
            _id: new ObjectId(req.session.userId)
        });

        console.log('User found:', user);

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        res.json({ coins: user.coins });
    } catch (error) {
        console.error("Error fetching coins:", error);
        res.status(500).json({ success: false, error: "Failed to fetch coins" });
    }
});

app.post('/api/update-coins', requireAuth, async (req, res) => {
    try {
        const { coins } = req.body;
        if (typeof coins !== 'number') {
            return res.status(400).json({ success: false, message: "Invalid coins value" });
        }

        const result = await db.collection('users').updateOne(
            { _id: new ObjectId(req.session.userId) },
            { $set: { coins } }
        );

        if (result.modifiedCount === 0) {
            return res.status(404).json({ success: false, message: "User not found or no changes made" });
        }

        res.json({ success: true, message: "Coins updated successfully" });
    } catch (error) {
        console.error("Error updating coins:", error);
        res.status(500).json({ success: false, error: "Failed to update coins" });
    }
});

// Get current user info
app.get('/api/user', (req, res) => {
    if (req.session.userId) {
        res.json({ 
            loggedIn: true, 
            username: req.session.username 
        });
    } else {
        res.json({ loggedIn: false });
    }
});

// Serve the main HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'fetching.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});