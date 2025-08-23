// Requires existing Express app & Mongoose connection.
// Add in server: const raidRoutes = require('./raidRoutes'); raidRoutes(app);

const mongoose = require('mongoose');

const RaidTeamSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, index: true },
    team: [Number],            // Pokémon IDs
    updatedAt: { type: Date, default: Date.now }
});
RaidTeamSchema.index({ userId: 1 }, { unique: true });

const RaidResultSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, index: true },
    bossId: Number,
    defeated: Boolean,
    captured: Boolean,
    timestamp: { type: Date, default: Date.now }
});

const RaidCooldownSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, unique: true },
    nextAvailableAt: Date
});

const RaidTeam = mongoose.models.RaidTeam || mongoose.model('RaidTeam', RaidTeamSchema);
const RaidResult = mongoose.models.RaidResult || mongoose.model('RaidResult', RaidResultSchema);
const RaidCooldown = mongoose.models.RaidCooldown || mongoose.model('RaidCooldown', RaidCooldownSchema);

module.exports = function(app){
    const RAID_COOLDOWN_MIN = 0;

    function getUserId(req){
        // Adjust based on your auth (session / JWT)
        return req.session?.userId || req.user?._id || req.body.userId || null;
    }

    app.get('/api/raid-team', async (req,res)=>{
        const userId = getUserId(req);
        if(!userId) return res.status(401).json({ error:'unauthorized' });
        const doc = await RaidTeam.findOne({ userId });
        return res.json({ team: doc?.team || [] });
    });

    app.post('/api/raid-team', async (req,res)=>{
        const userId = getUserId(req);
        if(!userId) return res.status(401).json({ success:false, message:'unauthorized' });
        const team = Array.isArray(req.body.team) ? req.body.team.slice(0,3) : [];
        try{
            await RaidTeam.findOneAndUpdate(
                { userId },
                { team, updatedAt: new Date() },
                { upsert:true, setDefaultsOnInsert:true }
            );
            res.json({ success:true, team });
        }catch(e){
            res.status(500).json({ success:false, message:'db error' });
        }
    });

    app.get('/api/raid-status', async (req,res)=>{
        const userId = getUserId(req);
        if(!userId) return res.status(401).json({ error:'unauthorized' });
        const cd = await RaidCooldown.findOne({ userId });
        res.json({ nextAvailableAt: cd?.nextAvailableAt || null });
    });

    app.post('/api/raid-result', async (req,res)=>{
        const userId = getUserId(req);
        if(!userId) return res.status(401).json({ success:false, message:'unauthorized' });
        const { bossId, defeated, captured, timestamp } = req.body;
        try{
            await RaidResult.create({
                userId,
                bossId,
                defeated: !!defeated,
                captured: !!captured,
                timestamp: timestamp ? new Date(timestamp) : new Date()
            });
            // Set cooldown if defeated attempt completes
            if (defeated){
                const nextAt = new Date(Date.now() + RAID_COOLDOWN_MIN*60000);
                await RaidCooldown.findOneAndUpdate(
                    { userId },
                    { nextAvailableAt: nextAt },
                    { upsert:true }
                );
            }
            res.json({ success:true });
        }catch(e){
            res.status(500).json({ success:false, message:'db error' });
        }
    });
};
