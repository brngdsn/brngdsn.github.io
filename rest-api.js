const express = require('express');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcryptjs');
const pool = require('./db');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const os = require('os');
const cron = require('node-cron');

const app = express();
const PORT = process.env.PORT || 3333;

// Trust the proxy to correctly identify client IPs
app.set('trust proxy', 1);

// Define the rate limit configuration
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 3, // Limit each IP to 5 login requests per windowMs
    message: 'Too many login attempts from this IP, please try again after 15 minutes',
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

const registerLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 3, // Limit each IP to 5 login requests per windowMs
    message: 'Too many login attempts from this IP, please try again after 15 minutes',
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Middleware
app.use(cors()); // Enable CORS
app.use(express.static('public')); // Serve static files
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Session middleware
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Configure Passport Local Strategy
passport.use(new LocalStrategy(async (username, password, done) => {
  try {
    const userResult = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    const user = userResult.rows[0];
    
    if (!user) return done(null, false, { message: 'Incorrect username' });
    
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return done(null, false, { message: 'Incorrect password' });
    
    return done(null, user);
  } catch (err) {
    return done(err);
  }
}));

// Serialize and Deserialize User
passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    const user = userResult.rows[0];
    done(null, user);
  } catch (err) {
    done(err);
  }
});

// Password Validation Function
function validatePassword(password) {
  const regex = /^(?=.*[0-9])(?=.*[!@#$%^&*])[a-zA-Z0-9!@#$%^&*]{8,}$/;
  return regex.test(password);
}

// Function to log system info into PostgreSQL
async function logSystemInfo() {
  const uptime = os.uptime();
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const cpuUsage = process.cpuUsage();
  const loadAvg = os.loadavg();
  const platform = os.platform();
  const arch = os.arch();
  const hostname = os.hostname();

  const query = `
    INSERT INTO system_logs (uptime, total_memory, free_memory, cpu_usage, load_avg, platform, arch, hostname)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8);
  `;
  const values = [uptime, totalMemory, freeMemory, cpuUsage, loadAvg, platform, arch, hostname];

  try {
    await pool.query(query, values);
    console.log('System info logged to PostgreSQL', values);
  } catch (err) {
    console.error('Error inserting system info:', err);
  }
}

// Routes
app.post('/register', registerLimiter, async (req, res) => {
  const { username, password, email } = req.body;
  
  if (!validatePassword(password)) {
    return res.status(400).send('Password must be at least 8 characters long, contain one number, and one symbol.');
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    await pool.query('INSERT INTO users (username, password, email) VALUES ($1, $2, $3)', [username, hashedPassword, email]);
    res.status(201).send({ username, email, message: "Success!", success: true });
  } catch (err) {
    res.status(500).send({message:'Error registering user', err});
  }
});

app.post('/login', loginLimiter, (req, res, next) => {
    passport.authenticate('local', (err, user, info) => {
      if (err) {
        return next(err);
      }
      if (!user) {
        return res.status(401).json({ message: info.message || 'Login failed' });
      }
      req.logIn(user, (err) => {
        if (err) {
          return next(err);
        }
        return res.status(200).json({ success: true, message: 'Login successful', redirectUrl: '/profile' });
      });
    })(req, res, next);
});  

app.get('/logout', (req, res) => {
  req.logout(() => {
    res.redirect('/');
  });
});

app.get('/system-info', async (req, res) => {
  const pastDate = req.query.pastDate ? new Date(req.query.pastDate) : null;
  const query = pastDate
    ? `SELECT * FROM system_logs WHERE timestamp >= NOW() - INTERVAL '24 hours' AND timestamp <= $1 ORDER BY timestamp ASC`
    : `SELECT * FROM system_logs WHERE timestamp >= NOW() - INTERVAL '24 hours' ORDER BY timestamp ASC`;

  const values = pastDate ? [pastDate] : [];
  
  try {
    const { rows } = await pool.query(query, values);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching system info:', err);
    res.status(500).json({ error: 'Error fetching system info' });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

logSystemInfo();

// Schedule the log function to run every 30 seconds
cron.schedule('*/30 * * * * *', () => {
  logSystemInfo();
});
