const express = require('express');
const { MongoClient , ObjectId } = require('mongodb');
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

app.post('/api/trade-offer', requireAuth, async (req, res) => {
    console.log("Received trade offer request:", req.body);
    const { toUserId, offeredPokemonId, requestedPokemonId } = req.body;
    if (!toUserId || !offeredPokemonId) {
        return res.status(400).json({ success: false, message: "Missing required fields" });
    }
    console.log("Trade offer details:", { toUserId, offeredPokemonId, requestedPokemonId });
    try {
        await db.collection('trades').insertOne({
            fromUserId: req.session.userId,
            toUserId,
            offeredPokemonId, // store the ID, not undefined
            requestedPokemonId: requestedPokemonId || null,
            status: 'pending',
            createdAt: new Date()
        });
        res.json({ success: true, message: "Trade offer sent successfully" });
    } catch (error) {
        console.error("Error sending trade offer:", error);
        res.status(500).json({ success: false, error: "Failed to send trade offer" });
    }
});

app.get('/api/trade-offers', requireAuth, async (req, res) => {
    try {
        const tradeOffers = await db.collection('trades').find({
            $or: [
                { fromUserId: req.session.userId },
                { toUserId: req.session.userId }
            ],
            status: 'pending'
        }).toArray();
        res.json({ success: true, tradeOffers });
    } catch (error) {
        console.error("Error fetching trade offers:", error);
    }
});

app.post('/api/trade-accept/:tradeId', requireAuth, async (req, res) => {
    const { tradeId } = req.params;
    try {
        const trade = await db.collection('trades').findOne({ _id: new ObjectId(tradeId), status: "pending" });
        if (!trade) return res.status(404).json({ success: false, message: "Trade not found" });

        // Check if current user is the recipient
        if (trade.toUserId && trade.toUserId != req.session.userId) {
            return res.status(403).json({ success: false, message: "Not authorized" });
        }

        // Transfer Pokémon
        await db.collection('pokemonCollection').updateOne(
            { id: trade.offeredPokemonId, userId: trade.fromUserId },
            { $set: { userId: req.session.userId } }
        );
        if (trade.requestedPokemonId) {
            await db.collection('pokemonCollection').updateOne(
                { id: trade.requestedPokemonId, userId: req.session.userId },
                { $set: { userId: trade.fromUserId } }
            );
        }

        // Update trade status
        await db.collection('trades').updateOne(
            { _id: new ObjectId(tradeId) },
            { $set: { status: "accepted", acceptedAt: new Date() } }
        );
        res.json({ success: true, message: "Trade completed" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to accept trade" });
    }
});

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
                { "type": "pokeball", "count": 10 },
                { "type": "greatball", "count": 5 },
                { "type": "ultraball", "count": 3 },
                { "type": "masterball", "count": 1 }
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

app.get('/api/market-pokemon', async (req, res) => {
    try {
        const marketPokemon = await db.collection('marketCollection').find().toArray();
        res.json(marketPokemon);
    }
    catch (error) {
        console.error("Error fetching market Pokemon:", error);
        res.status(500).json({ error: "Failed to fetch market Pokemon" });
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

app.get('/api/pokeballs', requireAuth, async (req, res) => {
    try {
        console.log('Session userId:', req.session.userId);

        const user = await db.collection('users').findOne({
            _id: new ObjectId(req.session.userId)
        });

        console.log('User found:', user);

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        res.json({ success: true, pokeballs: user.pokeballs }); // ✅ Add success: true
    } catch (error) {
        console.error("Error fetching pokeballs:", error);
        res.status(500).json({ success: false, error: "Failed to fetch pokeballs" });
    }
});


app.post('/api/pokeballs-update', requireAuth, async (req, res) => {
    const { type, count } = req.body;

    if (!type || typeof count !== 'number') {
        return res.status(400).json({ success: false, message: "Missing or invalid type/count" });
    }

    try {
        const userId = new ObjectId(req.session.userId);
        console.log("UserID:", userId, "Updating:", type, "To:", count);

        const result = await db.collection('users').updateOne(
            { _id: userId, "pokeballs.type": type },
            { $set: { "pokeballs.$.count": count } } // ✅ use $set instead of $inc
        );

        console.log("Update result:", result);

        if (result.modifiedCount === 0) {
            return res.status(404).json({ success: false, message: "Poké Ball type not found or count unchanged" });
        }

        res.json({ success: true, message: "Poké Ball count updated" });
    } catch (error) {
        console.error("Error updating Poké Balls:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
});


app.get('/api/buddy', requireAuth, async(req,res) =>{
    try{
        const user = await db.collection('users').findOne({
            _id: new ObjectId(req.session.userId)
        });

        console.log('User found:', user);

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        res.json({ buddy: user.buddy });
    } catch (error) {
        console.error("Error fetching buddy:", error);
        res.status(500).json({ success: false, error: "Failed to fetch buddy" });
    }
});

app.post('/api/update-buddy', requireAuth, async (req, res) => {
    try {
        const { buddy } = req.body;
        // if (typeof buddy !== 'number') {
        //     return res.status(400).json({ success: false, message: "Invalid buddy" });
        // }

        const result = await db.collection('users').updateOne(
            { _id: new ObjectId(req.session.userId) },
            { $set: { buddy } }
        );

        if (result.modifiedCount === 0) {
            return res.status(404).json({ success: false, message: "User not found or no changes made" });
        }

        res.json({ success: true, message: "buddy updated successfully" });
    } catch (error) {
        console.error("Error updating buddy:", error);
        res.status(500).json({ success: false, error: "Failed to update buddy" });
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

// Endpoint to update Poké Ball inventory
app.post('/api/update-pokeballs', async (req, res) => {
    try {
        const { userId } = req.session; // Get user ID from session
        const { pokeballs } = req.body; // Get updated inventory from request body

        // Validate data
        if (!userId || !pokeballs || !Array.isArray(pokeballs)) {
            console.log('Invalid data received:', { userId, pokeballs });
            return res.status(400).json({ success: false, message: 'Invalid data' });
        }

        // Ensure each item in the array has the correct structure
        const isValid = pokeballs.every(ball => 
            typeof ball.type === 'string' && 
            typeof ball.count === 'number' && 
            ball.count >= 0
        );

        if (!isValid) {
            console.log('Invalid Poké Ball structure:', pokeballs);
            return res.status(400).json({ success: false, message: 'Invalid Poké Ball structure' });
        }

        // Update the user's Poké Ball inventory in the database
        const updateResult = await db.collection('users').updateOne(
            { _id: new ObjectId(userId) },
            { $set: { pokeballs } }
        );

        if (updateResult.modifiedCount > 0) {
            res.json({ success: true, message: 'Poké Ball inventory updated successfully' });
        } else {
            res.status(500).json({ success: false, message: 'Failed to update inventory' });
        }
    } catch (error) {
        console.error('Error updating Poké Ball inventory:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Get Poké Ball inventory
// const { ObjectId } = require('mongodb');

app.get('/api/get-pokeballs', async (req, res) => {
    try {
      const { userId } = req.session;
  
      if (!userId) {
        return res.status(401).json({ success: false, message: 'User not logged in' });
      }
  
      const user = await db.collection('users').findOne({ _id: new ObjectId(userId) });
  
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }
  
      if (!user.pokeballs) {
        const defaultPokeballs = [
          { type: 'pokeball', count: 10 },
          { type: 'greatball', count: 5 },
          { type: 'ultraball', count: 2 },
          { type: 'masterball', count: 1 },
        ];
  
        await db.collection('users').updateOne(
          { _id: new ObjectId(userId) },
          { $set: { pokeballs: defaultPokeballs } }
        );
  
        return res.json({ success: true, pokeballs: defaultPokeballs });
      }
  
      // Normalize format here
      let pokeballArray = [];
  
      if (Array.isArray(user.pokeballs)) {
        pokeballArray = user.pokeballs;
      } else if (typeof user.pokeballs === 'object') {
        pokeballArray = Object.entries(user.pokeballs).map(([type, count]) => ({ type, count }));
      }
  
      res.json({ success: true, pokeballs: pokeballArray });
    } catch (error) {
      console.error('Error fetching Poké Ball inventory:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
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

app.post('/api/buy-pokemon/:id', requireAuth, async(req, res) => {
    try {
        const marketId = req.params.id;
        const userId = req.session.userId;
        const user = await db.collection('users').findOne({ _id: new ObjectId(userId) });
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }
        
        const pokemonId = parseInt(req.params.id, 10);
        console.log("Looking for id:", pokemonId);

        const marketPokemon = await db.collection('marketCollection').findOne({ id: pokemonId });
        console.log("Market Pokemon found:", marketPokemon);
        
        if (!marketPokemon) {
            return res.status(404).json({ success: false, message: "Pokemon not found in market" });
        }
        
        // Verify user has enough coins
        if (user.coins < marketPokemon.price) {
            return res.status(400).json({ success: false, message: "Not enough coins to buy this Pokemon" });
        }
        
        // Add Pokemon to user's collection
        await db.collection('pokemonCollection').insertOne({
            ...marketPokemon,
            userId: userId,
            purchasedAt: new Date()
        });
        
        // Remove Pokemon from market
        await db.collection('marketCollection').deleteOne({ id: pokemonId });
        
        if (marketPokemon.userId) {
            await db.collection('users').updateOne(
                { _id: new ObjectId(marketPokemon.userId) },
                { $inc: { coins: marketPokemon.price } }
            );
            
        }
        // Send success response
        res.json({ 
            success: true, 
            message: "Pokemon purchased successfully" 
        });
    }
    catch (error) {
        console.error("Error buying Pokemon:", error);
        res.status(500).json({ success: false, error: "Failed to buy Pokemon" });
    }
});

app.put('/api/market-pokemon/:id', requireAuth, async(req, res) => {
    try {
        const pokemonId = parseInt(req.params.id, 10);
        const { price } = req.body; // Get price from request body
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
            listedAt: new Date(),
            price: price // Include the price in the market listing
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