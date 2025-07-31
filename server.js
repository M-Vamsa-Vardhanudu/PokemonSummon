const express = require('express');
const http = require('http'); // Used to create the HTTP server for Express
const { Server } = require('socket.io'); // Socket.IO server class
const { MongoClient, ObjectId } = require('mongodb');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const session = require('express-session'); // Express session middleware

const app = express();
const server = http.createServer(app); // Create HTTP server for both Express and Socket.IO
const io = new Server(server, { // Initialize Socket.IO with the HTTP server
    cors: {
        origin: "http://localhost:3000", // Your frontend address (adjust if different)
        methods: ["GET", "POST"], // Specify allowed methods for CORS
        credentials: true // Crucial for sending cookies (sessions)
    }
});

const PORT = process.env.PORT || 8000; // Use port 8000 as defined previously

require('dotenv').config();

// MongoDB connection with fallback to in-memory storage
const uri = `mongodb+srv://vamsivardhan25:${process.env.DB_PASSWORD}@cluster0.woezb.mongodb.net/pokemonDB?retryWrites=true&w=majority&appName=Cluster0`;
const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
    connectTimeoutMS: 10000, // Give up initial connection after 10s
    socketTimeoutMS: 0, // Close sockets after 45s of inactivity
});
let db; // Global variable to hold the database instance

// Fallback in-memory storage for development
let memoryDB = {
    users: new Map(),
    pokemon: new Map(),
    chatMessages: [], // Add chat messages array
    marketCollection: new Map(),
    userIdCounter: 1
};
let useMemoryDB = false;

// Session middleware setup
// Store the session middleware in a variable so it can be reused
const sessionMiddleware = session({
    secret: 'pokemon-secret-key', // Strong, unique secret for session encryption
    resave: false, // Don't save session if unmodified
    saveUninitialized: false, // Don't create session until something stored
    cookie: { 
        secure: false, // Set to true if using HTTPS (recommended for production)
        httpOnly: true, // Prevents client-side JS from accessing cookies
        sameSite: 'lax', // Protects against CSRF attacks
        maxAge: 1000 * 60 * 60 * 24 // 1 day in milliseconds
    }
});

// Apply session middleware to Express app
app.use(sessionMiddleware);
app.use(express.json());
app.use(cors({
    origin: "http://localhost:3000", // Your frontend address
    credentials: true // Allow cookies to be sent with requests
}));
app.use(express.static('.')); // Serve static files from the current directory

// Share the Express session middleware with Socket.IO
// This allows Socket.IO connections to access req.session
io.engine.use(sessionMiddleware);


// Connect to MongoDB
async function connectDB() {
    try {
        console.log('Attempting to connect to MongoDB Atlas...');
        await client.connect();
        
        // Verify the connection
        await client.db("admin").command({ ping: 1 });
        
        console.log("MongoDB Atlas connected successfully!");
        db = client.db("pokemonDB");
        useMemoryDB = false;
        
        // Test database access
        const collections = await db.listCollections().toArray();
        console.log(`Connected to database 'pokemonDB' with ${collections.length} collections`);
        
    } catch (error) {
        console.error("MongoDB Atlas connection failed:", error.message);
        console.log("Falling back to in-memory database for development...");
        useMemoryDB = true;
        db = null;
    }
}

connectDB();

// Memory database helper functions
const memoryDBHelpers = {
    async findUser(username) {
        if (useMemoryDB) {
            for (let [id, user] of memoryDB.users) {
                if (user.username === username) {
                    return { _id: id, ...user };
                }
            }
            return null;
        } else {
            return await db.collection('users').findOne({ username });
        }
    },
    
    async insertUser(userData) {
        if (useMemoryDB) {
            const userId = memoryDB.userIdCounter++;
            memoryDB.users.set(userId, userData);
            return { _id: userId, ...userData };
        } else {
            return await db.collection('users').insertOne(userData);
        }
    },
    
    async findUserById(userId) {
        if (useMemoryDB) {
            const user = memoryDB.users.get(parseInt(userId));
            return user ? { _id: userId, ...user } : null;
        } else {
            return await db.collection('users').findOne({ _id: new ObjectId(userId) });
        }
    },
    
    async updateUser(userId, updateData) {
        if (useMemoryDB) {
            const existingUser = memoryDB.users.get(parseInt(userId));
            if (existingUser) {
                const updatedUser = { ...existingUser, ...updateData };
                memoryDB.users.set(parseInt(userId), updatedUser);
                return { modifiedCount: 1 };
            }
            return { modifiedCount: 0 };
        } else {
            return await db.collection('users').updateOne(
                { _id: new ObjectId(userId) },
                { $set: updateData }
            );
        }
    },
    
    // Chat message helpers
    async insertChatMessage(messageData) {
        if (useMemoryDB) {
            memoryDB.chatMessages.push(messageData);
            return { success: true };
        } else {
            return await db.collection('chatMessages').insertOne(messageData);
        }
    },
    
    async getChatHistory(limit = 50) {
        if (useMemoryDB) {
            // Get the last 'limit' messages and reverse to chronological order
            const messages = memoryDB.chatMessages.slice(-limit);
            return messages;
        } else {
            const chatHistory = await db.collection('chatMessages')
                .find({})
                .sort({ timestamp: -1 })
                .limit(limit)
                .toArray();
            return chatHistory.reverse();
        }
    },
    
    // Pokemon helpers
    async insertPokemon(pokemonData) {
        if (useMemoryDB) {
            const pokemonId = Date.now(); // Simple ID generation
            memoryDB.pokemon.set(pokemonId, pokemonData);
            return { success: true, insertedId: pokemonId };
        } else {
            return await db.collection('pokemonCollection').insertOne(pokemonData);
        }
    },
    
    async getUserPokemon(userId) {
        if (useMemoryDB) {
            const userPokemon = [];
            for (let [id, pokemon] of memoryDB.pokemon) {
                if (pokemon.userId === userId) {
                    userPokemon.push({ _id: id, ...pokemon });
                }
            }
            return userPokemon;
        } else {
            return await db.collection('pokemonCollection')
                .find({ userId: userId })
                .toArray();
        }
    }
};

// --- Authentication Endpoints ---

// User registration endpoint
app.post('/api/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ success: false, message: "Username and password are required" });
        }

        if (username.length < 3) {
            return res.status(400).json({ success: false, message: "Username must be at least 3 characters long" });
        }

        if (password.length < 6) {
            return res.status(400).json({ success: false, message: "Password must be at least 6 characters long" });
        }
        
        // Check if user already exists using memory database helpers
        const existingUser = await memoryDBHelpers.findUser(username);
        if (existingUser) {
            return res.status(400).json({ success: false, message: "Username already exists" });
        }
        
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        
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
        
        // Insert user using memory database helpers
        await memoryDBHelpers.insertUser(userData);
        
        console.log(`✅ User '${username}' registered successfully using ${useMemoryDB ? 'memory' : 'MongoDB'} database`);
        res.json({ success: true, message: "User registered successfully" });
        
    } catch (error) {
        console.error("Error registering user:", error);
        res.status(500).json({ success: false, message: "Failed to register user. Please try again." });
    }
});

// User login endpoint
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ success: false, message: "Username and password are required" });
        }
        
        // Find user using memory database helpers
        const user = await memoryDBHelpers.findUser(username);
        if (!user) {
            return res.status(400).json({ success: false, message: "User not found" });
        }
        
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(400).json({ success: false, message: "Invalid password" });
        }
        
        // Set session variables upon successful login
        req.session.userId = user._id.toString(); // Store as string
        req.session.username = user.username;
        
        console.log(`✅ User '${username}' logged in successfully using ${useMemoryDB ? 'memory' : 'MongoDB'} database`);
        res.json({ success: true, message: "Login successful", username: user.username });
        
    } catch (error) {
        console.error("Error logging in:", error);
        res.status(500).json({ success: false, message: "Failed to login. Please try again." });
    }
});

// Logout endpoint
app.post('/api/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ success: false, error: "Failed to logout" });
        }
        // Clear the cookie on the client side
        res.clearCookie('connect.sid'); // Default cookie name for express-session
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

// Get current user info (for frontend to check login status)
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

// --- Socket.IO Chat Handling ---
io.on('connection', (socket) => {
    // Access session data attached to the socket's request
    const session = socket.request.session;
    const username = session ? session.username : null; // Get username from session

    if (!username) {
        console.log('🚫 User connected to chat but not logged in. Disconnecting chat socket.');
        socket.disconnect(true); // Disconnect users who are not logged in
        return;
    }

    console.log(`🟢 User ${username} connected to chat (Socket ID: ${socket.id})`);

    // Listen for 'chat message' events from clients
    // The client should only send the message content, not the user.
    socket.on('chat message', async (messageContent) => { // Made async to use await for DB operation
        // Use the verified username from the server-side session
        const chatMessage = {
            user: username, // Verified user from session
            message: messageContent, // Client only sends the message content
            timestamp: new Date(), // Use Date object for easier sorting in DB
            // You might want to store userId as well for more complex features
            // userId: session.userId 
        };
        console.log(`💬 [${chatMessage.timestamp.toLocaleString()}] ${chatMessage.user}: ${chatMessage.message}`);
        
        try {
            // Save the message using memory database helpers
            await memoryDBHelpers.insertChatMessage(chatMessage);
            console.log(`Chat message saved to ${useMemoryDB ? 'memory' : 'MongoDB'} database.`);
        } catch (error) {
            console.error('Error saving chat message to DB:', error);
        }

        // Broadcast the message to all connected clients
        // Send the full message object including the server-generated timestamp
        io.emit('chat message', {
            user: chatMessage.user,
            message: chatMessage.message,
            timestamp: chatMessage.timestamp.toLocaleString() // Convert to locale string for client display
        }); 
    });

    // Handle user disconnects
    socket.on('disconnect', () => {
        console.log(`🔴 User ${username} disconnected (Socket ID: ${socket.id})`);
    });
});

// --- NEW: API endpoint to fetch chat history ---
app.get('/api/chat-history', requireAuth, async (req, res) => {
    try {
        // Fetch the most recent 50 messages using memory database helpers
        const chatHistory = await memoryDBHelpers.getChatHistory(50);

        // Format timestamps for client display
        const formattedHistory = chatHistory.map(msg => ({
            user: msg.user,
            message: msg.message,
            timestamp: msg.timestamp.toLocaleString()
        }));

        console.log(`📜 Chat history loaded: ${formattedHistory.length} messages from ${useMemoryDB ? 'memory' : 'MongoDB'} database`);
        res.json({ success: true, history: formattedHistory });
    } catch (error) {
        console.error('Error fetching chat history:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch chat history.' });
    }
});


// --- Game/Pokemon API Endpoints ---

// Modified API endpoint to save Pokemon data with rarity
app.post('/api/save-pokemon', requireAuth, async (req, res) => {
    try {
        const { pokemonName, pokemonImage, pokemonId, pokemonTypes, rarity} = req.body;
        
        const pokemonData = {
            userId: req.session.userId, // Associate Pokemon with user
            pokemonName: pokemonName,
            pokemonImage: pokemonImage,
            pokemonId: pokemonId,
            pokemonTypes: pokemonTypes,
            rarity: rarity || 'common', // Include rarity info
            capturedAt: new Date()
        };
        
        const result = await memoryDBHelpers.insertPokemon(pokemonData);
        
        console.log(`🎯 Pokemon ${pokemonName} saved for user ${req.session.userId} using ${useMemoryDB ? 'memory' : 'MongoDB'} database`);
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
        const userPokemon = await memoryDBHelpers.getUserPokemon(req.session.userId);
        console.log(`🔍 Fetched ${userPokemon.length} Pokemon for user ${req.session.userId} from ${useMemoryDB ? 'memory' : 'MongoDB'} database`);
        res.json(userPokemon);
    } catch (error) {
        console.error("Error fetching Pokemon:", error);
        res.status(500).json({ error: "Failed to fetch Pokemon" });
    }
});

app.get('/api/coins', requireAuth, async (req, res) => {
    try {
        console.log('Session userId:', req.session.userId);

        // Find user using memory database helpers
        const user = await memoryDBHelpers.findUserById(req.session.userId);

        console.log('User found:', user ? user.username : 'Not found');

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

        // Update user using memory database helpers
        const result = await memoryDBHelpers.updateUser(req.session.userId, { coins });

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


app.delete('/api/trade-pokemon/:id', requireAuth, async(req, res) => {
    try {
        const pokemonId = parseInt(req.params.id , 10);
        console.log("Trading Pokemon with ID:", pokemonId);
        
        const result = await db.collection('pokemonCollection').deleteOne({
            id: pokemonId,
            userId: req.session.userId
        });
        
        if (result.deletedCount === 0) {
            return res.status(404).json({ success: false, message: "Pokemon not found or not owned by user" });
        }
        
        res.json({ success: true, message: "Pokemon traded successfully" });
    }
    catch(error) {
        console.error("Error trading Pokemon:", error);
        res.status(500).json({ success: false, error: "Failed to trade Pokemon" });
    }
});

app.put('/api/market-pokemon/:id', requireAuth, async(req, res) => {
    try {
        const pokemonId = parseInt(req.params.id, 10);
        console.log("Putting Pokemon in market with ID:", pokemonId);
        
        // First, retrieve the complete Pokemon data
        const pokemonData = await db.collection('pokemonCollection').findOne({
            id: pokemonId,
            userId: req.session.userId
        });
        
        if (!pokemonData) {
            return res.status(404).json({ 
                success: false, 
                message: "Pokemon not found or not owned by user" 
            });
        }
        
        // Now delete it from the user's collection
        const deleteResult = await db.collection('pokemonCollection').deleteOne({
            id: pokemonId,
            userId: req.session.userId
        });
        
        // Insert the complete Pokemon data into the market collection
        const marketResult = await db.collection('marketCollection').insertOne({
            ...pokemonData,
            listedAt: new Date()
        });

        res.json({ 
            success: true, 
            message: "Pokemon sent to market successfully" 
        });
    }
    catch(error) {
        console.error("Error putting Pokemon in market:", error);
        res.status(500).json({ 
            success: false, 
            error: "Failed to put Pokemon in market" 
        });
    }
});

// Start the server
server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
