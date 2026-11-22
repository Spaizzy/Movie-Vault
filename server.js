require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;


// ===========TMDB API KEY===========
// Add this at the top of your server.js
const TMDB_API_KEY = process.env.TMDB_API_KEY; // Add your TMDB key to .env

async function getTitleFromTMDB(tmdbId, type) {
    try {
        const endpoint = type === 'movie' ? `movie/${tmdbId}` : `tv/${tmdbId}`;
        const response = await axios.get(`https://api.themoviedb.org/3/${endpoint}`, {
            params: { api_key: TMDB_API_KEY }
        });
        return response.data.title || response.data.name;
    } catch (error) {
        console.error('TMDB fetch error:', error);
        return null;
    }
}

// =============================================
// DATABASE SETUP (MongoDB vs PostgreSQL)
// =============================================
let databaseReady = false;

if (process.env.MONGO_URI) {
    // MongoDB with Mongoose
    const mongoose = require('mongoose');
    mongoose.connect(process.env.MONGO_URI)
        .then(() => {
            console.log("MongoDB connected successfully");
            databaseReady = true;
        })
        .catch(err => console.error("MongoDB connection error:", err));

    const userSchema = new mongoose.Schema({
        username: { type: String, required: true },
        email: { type: String, required: true, unique: true },
        password: { type: String, required: true },
        verified: { type: Boolean, default: false },
        avatar: { type: String, default: null },
        plan: { type: String, default: 'free' },
        createdAt: { type: Date, default: Date.now }
    });
    User = mongoose.model('User', userSchema);
} else if (process.env.DATABASE_URL) {
    // PostgreSQL with Prisma
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    const User = {
        create: (data) => prisma.user.create({ data }),
        findUnique: (where) => prisma.user.findUnique({ where }),
        findFirst: (where) => prisma.user.findFirst({ where }),
        update: (where, data) => prisma.user.update({ where, data }),
        delete: (where) => prisma.user.delete({ where }),
    };
    databaseReady = true;
}

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Nodemailer Setup
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, // true for 465, false for other ports
    auth: {
        user: process.env.EMAIL_USER, // Your Gmail address
        pass: process.env.EMAIL_PASS  // The 16-character App Password (with spaces if provided)
    }
});

// =============================================
// MEDIA INTEGRATION SERVICES
// =============================================

// Real-Debrid API Client
const rdAPI = axios.create({
    baseURL: 'https://api.real-debrid.com/rest/1.0/',
    headers: { 'Authorization': `Bearer ${process.env.RD_API_KEY}` }
});

// Prowlarr API Client
const prowlarrAPI = axios.create({
    baseURL: process.env.PROWLARR_URL,
    headers: { 'X-Api-Key': process.env.PROWLARR_API_KEY }
});

// Prowlarr Search
async function searchWithProwlarr(title, type) {
    try {
        const response = await prowlarrAPI.get('/api/v1/search', {
            params: {
                query: title,
                limit: 20
            }
        });
        return response.data.results || [];
    } catch (error) {
        console.error('Prowlarr search error:', error.message);
        return [];
    }
}

// Real-Debrid Processing
async function processWithRealDebrid(magnets) {
    const hashes = magnets.map(m => m.magnet.match(/btih:([a-zA-Z0-9]+)/)?.[1]).filter(Boolean);
    
    if (hashes.length === 0) return [];

    try {
        const availabilityResponse = await rdAPI.get(`torrents/instantAvailability/${hashes.join('/')}`);
        const availabilityData = availabilityResponse.data;

        const results = [];
        for (const magnet of magnets) {
            const hash = magnet.magnet.match(/btih:([a-zA-Z0-9]+)/)?.[1];
            if (!hash) continue;

            if (availabilityData[hash] && availabilityData[hash].rd) {
                const torrentsResponse = await rdAPI.get('torrents');
                const targetTorrent = torrentsResponse.data.find(t => t.hash === hash);

                if (targetTorrent) {
                    const videoFile = targetTorrent.files.find(f => f.selected && (f.path.endsWith('.mkv') || f.path.endsWith('.mp4')));
                    if (videoFile) {
                        const linkResponse = await rdAPI.get(`unrestrict/link/${videoFile.link}`);
                        results.push({ 
                            quality: magnet.quality, 
                            link: linkResponse.data.download, 
                            size: magnet.size,
                            cached: true 
                        });
                    }
                }
            }
        }
        return results;
    } catch (error) {
        console.error('Real-Debrid process error:', error.message);
        return [];
    }
}

// Real-Debrid Process
async function processWithRealDebrid(magnets) {
    // 1. Filter magnets to only those with a hash
    const hashes = magnets.map(m => m.magnet.match(/btih:([a-zA-Z0-9]+)/)?.[1]).filter(Boolean);
    
    // 2. If no hashes, return empty
    if (hashes.length === 0) return [];

    try {
        // 3. Check instant availability for ALL hashes at once [citation:1][citation:6]
        const availabilityResponse = await rdAPI.get(`torrents/instantAvailability/${hashes.join('/')}`);
        const availabilityData = availabilityResponse.data;

        const results = [];
        for (const magnet of magnets) {
            const hash = magnet.magnet.match(/btih:([a-zA-Z0-9]+)/)?.[1];
            if (!hash) continue;

            // 4. Check if this specific hash is cached
            if (availabilityData[hash] && availabilityData[hash].rd) {
                // Cached! Now we need to find the torrent ID on the user's account
                const torrentsResponse = await rdAPI.get('torrents');
                const targetTorrent = torrentsResponse.data.find(t => t.hash === hash);

                if (targetTorrent) {
                    // 5. Find the video file
                    const videoFile = targetTorrent.files.find(f => f.selected && (f.path.endsWith('.mkv') || f.path.endsWith('.mp4')));
                    if (videoFile) {
                        // 6. Unrestrict the link (this creates a fresh, streamable link)
                        const linkResponse = await rdAPI.get(`unrestrict/link/${videoFile.link}`);
                        results.push({ 
                            quality: magnet.quality, 
                            link: linkResponse.data.download, // This link is fresh and valid
                            size: magnet.size,
                            cached: true 
                        });
                    }
                }
            } else {
                // Torrent not cached. We'll add it to RD and wait, but this is a heavy operation.
                // For a real app, you'd put this in a background queue.
                // For simplicity, skip or queue it. 
                console.log('Torrent not cached:', hash);
            }
        }
        return results;
    } catch (error) {
        console.error('Real-Debrid process error:', error.message);
        return [];
    }
}

// Main "Get Stream" Function
async function getMediaStream(tmdbId, type, season, episode) {
    // 1. Search with Prowlarr
    const searchResults = await searchWithProwlarr(tmdbId, type, season, episode);
    const magnets = searchResults.map(r => ({ magnet: r.magnetUrl, quality: r.quality, size: r.size }));

    // 2. Process with Real-Debrid
    // This is async and may take time if a torrent isn't cached.
    // For production, this should be handled asynchronously (e.g., WebSocket, Queue).
    const streamLinks = await processWithRealDebrid(magnets);

    // 3. Return the best link (prioritizing cached sources and highest quality)
    streamLinks.sort((a, b) => (b.cached - a.cached) || (a.quality.localeCompare(b.quality)));
    return streamLinks[0] || null;
}

// =============================================
// AUTH ROUTES
// =============================================

app.post('/api/auth/signup', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        if (!username || !email || !password) return res.status(400).json({ message: 'All fields are required' });

        const existingUser = await User.findUnique({ email: email });
        if (existingUser) return res.status(400).json({ message: 'Email already registered' });

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await User.create({ username, email, password: hashedPassword, verified: false });

        // Email Verification - Send Code via Nodemailer
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        // In production, store the code in your database associated with the user
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'MovieVault - Verify Your Email',
            html: `<p>Your verification code is: <strong>${verificationCode}</strong></p>`
        });

        res.status(201).json({ message: 'User created. Verification code sent.', user: { id: newUser.id, username, email, verified: false } });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findUnique({ email: email });
        
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        if (!user.verified) {
            return res.status(403).json({ message: 'Account not verified', verified: false });
        }

        const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
        const { password: _, ...safeUser } = user;
        
        res.status(200).json({ message: 'Login successful', token, user: safeUser });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ... (Other auth routes: verify-email, update, change-password, delete)

// =============================================
// MEDIA ENDPOINTS
// =============================================

// =============================================
// MEDIA ENDPOINT
// =============================================
app.get('/api/get-stream', async (req, res) => {
    const { tmdbId, type, s, e } = req.query;

    try {
        // STEP 1: Get the ACTUAL title from TMDB
        const title = await getTitleFromTMDB(tmdbId, type);
        if (!title) {
            return res.status(404).json({ message: 'Movie not found in TMDB' });
        }

        // For TV shows, append season/episode
        const searchQuery = type === 'tv' ? `${title} S${s || ''}E${e || ''}` : title;

        // STEP 2: Search Prowlarr
        const searchResults = await searchWithProwlarr(searchQuery, type);
        const magnets = searchResults.map(r => ({ magnet: r.magnetUrl, quality: r.quality, size: r.size }));

        // STEP 3: Process with Real-Debrid
        const streamLinks = await processWithRealDebrid(magnets);

        // STEP 4: Return the first available link
        if (streamLinks.length > 0) {
            res.json({ streamUrl: streamLinks[0].link, quality: streamLinks[0].quality, cached: true });
        } else {
            res.status(404).json({ message: 'No available streams found.' });
        }
    } catch (error) {
        console.error('Stream error:', error);
        res.status(500).json({ message: 'Server error processing stream request.' });
    }
});

app.get('/api/download/movie/:id', async (req, res) => {
    // Similar to get-stream, but point to a direct download endpoint
    // For Real-Debrid, the download link is a direct HTTP link.
    // You may want to proxy this through your server to avoid leaking the RD token.
    try {
        const streamData = await getMediaStream(req.params.id, 'movie');
        if (streamData) {
            res.json({ streamUrl: streamData.link, filename: `movie_${req.params.id}.mp4` });
        } else {
            res.status(404).json({ message: 'No available download sources.' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server error.' });
    }
});

// =============================================
// START SERVER
// =============================================
app.listen(PORT, async () => {
    console.log(`MovieVault Backend running on port ${PORT}`);
    if (!databaseReady) {
        console.log("⚠️  Database is not configured. Authentication routes will fail.");
    }
});