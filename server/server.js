const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const http = require('http');
const { Server } = require('socket.io');
const multer = require('multer');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// Expose the uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Configure Multer
const upload = multer({ dest: path.join(__dirname, 'uploads/') });

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT']
  }
});

const PORT = 3001;
const JWT_SECRET = 'RAW_PROCESS_SUPER_SECRET_KEY_PROTOTYPE';

let db;

async function initializeDB() {
  db = await open({
    filename: './database.db',
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      status TEXT NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      full_name TEXT,
      dob TEXT,
      github_username TEXT
    );
    CREATE TABLE IF NOT EXISTS likes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      log_id INTEGER,
      username TEXT,
      UNIQUE(log_id, username),
      FOREIGN KEY (log_id) REFERENCES logs(id)
    );
    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      log_id INTEGER,
      username TEXT,
      content TEXT NOT NULL,
      type TEXT DEFAULT 'comment',
      accepted BOOLEAN DEFAULT 0,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (log_id) REFERENCES logs(id)
    );
    CREATE TABLE IF NOT EXISTS projects (
      name TEXT PRIMARY KEY COLLATE NOCASE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      recipient TEXT NOT NULL,
      actor TEXT NOT NULL,
      type TEXT NOT NULL,
      log_id INTEGER,
      is_read BOOLEAN DEFAULT 0,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (log_id) REFERENCES logs(id)
    );
    CREATE TABLE IF NOT EXISTS followers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      follower TEXT NOT NULL,
      followed TEXT NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(follower, followed)
    );
  `);

  // Parse existing logs to dynamically seed the projects schema securely
  try {
    const existingProjects = await db.all('SELECT DISTINCT project FROM logs WHERE project IS NOT NULL');
    for (const p of existingProjects) {
      if (p.project && p.project.trim() !== '') {
        await db.run('INSERT OR IGNORE INTO projects (name) VALUES (?)', [p.project]);
      }
    }
  } catch(e) {}

  // Migrate DB to include optional imageUrl, project, author, and privacy layers
  try { await db.exec('ALTER TABLE logs ADD COLUMN imageUrl TEXT DEFAULT NULL'); } catch (e) {}
  try { await db.exec("ALTER TABLE logs ADD COLUMN project TEXT DEFAULT 'Uncategorized'"); } catch (e) {}
  try { await db.exec("ALTER TABLE logs ADD COLUMN author TEXT DEFAULT 'admin' COLLATE NOCASE"); } catch (e) {}
  try { await db.exec("ALTER TABLE projects ADD COLUMN owner TEXT DEFAULT 'admin' COLLATE NOCASE"); } catch (e) {}
  try { await db.exec("ALTER TABLE projects ADD COLUMN is_public BOOLEAN DEFAULT 1"); } catch (e) {}

  try { await db.exec('ALTER TABLE users ADD COLUMN full_name TEXT'); } catch (e) {}
  try { await db.exec('ALTER TABLE users ADD COLUMN dob TEXT'); } catch (e) {}
  try { await db.exec('ALTER TABLE users ADD COLUMN github_username TEXT'); } catch (e) {}
  try { await db.exec('ALTER TABLE users ADD COLUMN bio TEXT'); } catch (e) {}
  try { await db.exec('ALTER TABLE users ADD COLUMN avatar_url TEXT DEFAULT NULL'); } catch (e) {}
  try { await db.exec('ALTER TABLE users ADD COLUMN cover_url TEXT DEFAULT NULL'); } catch (e) {}
  try { await db.exec('ALTER TABLE users ADD COLUMN skills TEXT DEFAULT NULL'); } catch (e) {}
  try { await db.exec('ALTER TABLE users ADD COLUMN tech_stack TEXT DEFAULT NULL'); } catch (e) {}
  try { await db.exec('ALTER TABLE users ADD COLUMN github_link TEXT DEFAULT NULL'); } catch (e) {}
  try { await db.exec('ALTER TABLE users ADD COLUMN linkedin_link TEXT DEFAULT NULL'); } catch (e) {}
  try { await db.exec('ALTER TABLE users ADD COLUMN portfolio_link TEXT DEFAULT NULL'); } catch (e) {}
  try { await db.exec('ALTER TABLE users ADD COLUMN company TEXT DEFAULT NULL'); } catch (e) {}
  try { await db.exec('ALTER TABLE users ADD COLUMN college TEXT DEFAULT NULL'); } catch (e) {}
  try { await db.exec('ALTER TABLE users ADD COLUMN location TEXT DEFAULT NULL'); } catch (e) {}
  try { await db.exec('ALTER TABLE users ADD COLUMN created_at DATETIME DEFAULT NULL'); } catch (e) {}

  try { await db.exec('ALTER TABLE logs ADD COLUMN language TEXT DEFAULT NULL'); } catch (e) {}
  try { await db.exec('ALTER TABLE logs ADD COLUMN tags TEXT DEFAULT NULL'); } catch (e) {}

  await db.exec(`
    CREATE TABLE IF NOT EXISTS pinned_projects (
      username TEXT NOT NULL,
      project_name TEXT NOT NULL,
      UNIQUE(username, project_name)
    );
    CREATE TABLE IF NOT EXISTS pinned_logs (
      username TEXT NOT NULL,
      log_id INTEGER NOT NULL,
      UNIQUE(username, log_id)
    );
  `);


  // Migrate legacy logs to 'admin'
  await db.run("UPDATE logs SET author = 'admin' WHERE author IS NULL OR author = 'System'");

  const countLogs = await db.get('SELECT COUNT(*) as count FROM logs');
  if (countLogs.count === 0) {
    const defaultLogs = [
      ["Initial Shader Compiled", "Successfully mapped the vertex buffers for the procedural terrain. 60fps locked at 4k.", "success", null, "Engine_Core"],
      ["Memory Leak Detected", "Buffer overflow in module 'physics_engine.dll'. Allocated memory exceeding 16GB. Process terminated.", "error", null, "Physics_Sim"]
    ];
    for (const log of defaultLogs) {
      await db.run('INSERT INTO logs (title, content, status, imageUrl, project) VALUES (?, ?, ?, ?, ?)', log);
    }
  }

  const countUsers = await db.get('SELECT COUNT(*) as count FROM users');
  if (countUsers.count === 0) {
    const hash = await bcrypt.hash('password', 10);
    await db.run('INSERT INTO users (username, password) VALUES (?, ?)', ['admin', hash]);
  }
}

const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(403).json({ error: "No token provided" });

  const token = authHeader.split(' ')[1];
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) return res.status(403).json({ error: 'Token is not valid' });
      req.userId = decoded.id;
      req.iat = decoded.iat;
      next();
    });
};

let onlineUsers = 0;
io.on('connection', (socket) => {
  onlineUsers++;
  io.emit('onlineCount', onlineUsers);
  console.log(`Node connected: ${socket.id}. Total: ${onlineUsers}`);

  socket.on('disconnect', () => {
    onlineUsers = Math.max(0, onlineUsers - 1);
    io.emit('onlineCount', onlineUsers);
    console.log(`Node disconnected: ${socket.id}. Total: ${onlineUsers}`);
  });
});

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  const normalizedUsername = username.toLowerCase();
  try {
    const user = await db.get('SELECT * FROM users WHERE username = ?', normalizedUsername);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const passwordIsValid = await bcrypt.compare(password, user.password);
    if (!passwordIsValid) return res.status(401).json({ error: 'Invalid password' });

    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: 86400 });
    res.json({ auth: true, token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/register', async (req, res) => {
  const { username, password, full_name, dob, github_username } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
  const normalizedUsername = username.toLowerCase();

  try {
    const existing = await db.get('SELECT * FROM users WHERE username = ?', normalizedUsername);
    if (existing) return res.status(409).json({ error: 'Observer_ID already engaged' });

    const hash = await bcrypt.hash(password, 10);
    const result = await db.run(
      'INSERT INTO users (username, password, full_name, dob, github_username) VALUES (?, ?, ?, ?, ?)',
      [normalizedUsername, hash, full_name, dob, github_username]
    );
    
    const token = jwt.sign({ id: result.lastID }, JWT_SECRET, { expiresIn: 86400 });
    res.json({ auth: true, token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/feed', verifyToken, async (req, res) => {
  try {
    const user = await db.get('SELECT username FROM users WHERE id = ?', req.userId);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    const currentUsername = user.username;

    // Securely filter logs ensuring only public OR correctly owned projects flow externally
    const logs = await db.all(`
      SELECT l.*, IFNULL(p.is_public, 1) as is_public FROM logs l 
      LEFT JOIN projects p ON l.project = p.name 
      WHERE l.project = 'Uncategorized' OR p.is_public = 1 OR p.owner = ?
      ORDER BY l.timestamp DESC`, 
      [currentUsername]
    );

    const comments = await db.all('SELECT * FROM comments ORDER BY timestamp ASC');
    const likes = await db.all('SELECT log_id, username FROM likes');
    const projectsList = await db.all('SELECT name, is_public, owner FROM projects WHERE is_public = 1 OR owner = ? ORDER BY created_at DESC', [currentUsername]);

    const mappedLogs = logs.map(log => {
      return {
        ...log,
        comments: comments.filter(c => c.log_id === log.id),
        likes: likes.filter(l => l.log_id === log.id).map(l => l.username)
      };
    });

    res.json({ logs: mappedLogs, projects: projectsList });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/feed/paginated', verifyToken, async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  const offset = parseInt(req.query.offset) || 0;
  const project = req.query.project;

  try {
    const user = await db.get('SELECT username FROM users WHERE id = ?', req.userId);
    const currentUsername = user.username;
    const author = req.query.author;

    let query = `
      SELECT l.*, IFNULL(p.is_public, 1) as is_public FROM logs l 
      LEFT JOIN projects p ON l.project = p.name 
      WHERE (l.project = 'Uncategorized' OR p.is_public = 1 OR p.owner = ?)
    `;
    let params = [currentUsername];

    if (project) {
      query += ` AND l.project = ?`;
      params.push(project);
    }

    if (author) {
      query += ` AND l.author = ?`;
      params.push(author);
    }

    query += ` ORDER BY l.timestamp DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const logs = await db.all(query, params);
    
    // Total count for frontend to know if more logs exist
    let countQuery = `
       SELECT COUNT(*) as count FROM logs l 
       LEFT JOIN projects p ON l.project = p.name 
       WHERE (l.project = 'Uncategorized' OR p.is_public = 1 OR p.owner = ?)
    `;
    let countParams = [currentUsername];
    if (project) {
        countQuery += ` AND l.project = ?`;
        countParams.push(project);
    }
    if (author) {
        countQuery += ` AND l.author = ?`;
        countParams.push(author);
    }
    const totalCount = await db.get(countQuery, countParams);

    const logIds = logs.map(l => l.id);
    let comments = [];
    let likes = [];
    if (logIds.length > 0) {
      const placeholders = logIds.map(() => '?').join(',');
      comments = await db.all(`SELECT * FROM comments WHERE log_id IN (${placeholders})`, logIds);
      likes = await db.all(`SELECT log_id, username FROM likes WHERE log_id IN (${placeholders})`, logIds);
    }

    const mappedLogs = logs.map(log => ({
      ...log,
      comments: comments.filter(c => c.log_id === log.id),
      likes: likes.filter(l => l.log_id === log.id).map(l => l.username)
    }));

    const projectsList = await db.all('SELECT name, is_public, owner FROM projects WHERE is_public = 1 OR owner = ? ORDER BY created_at DESC', [currentUsername]);

    res.json({ 
        logs: mappedLogs, 
        projects: projectsList,
        hasMore: (offset + limit) < totalCount.count,
        total: totalCount.count
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Upgraded with Multer multi-part parser & Security Injection
app.post('/api/feed', verifyToken, upload.single('image'), async (req, res) => {
  const { title, content, status, project, language, tags } = req.body;
  const user = await db.get('SELECT username FROM users WHERE id = ?', req.userId);
  
  if (!title || !content || !status) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  
  const safeProjectName = project || 'Uncategorized';
  const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

  try {
    const result = await db.run(
      'INSERT INTO logs (title, content, status, imageUrl, project, author, language, tags) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [title, content, status, imageUrl, safeProjectName, user.username, language || null, tags || null]
    );
    const newLog = await db.get('SELECT * FROM logs WHERE id = ?', result.lastID);
    newLog.comments = [];
    newLog.likes = [];
    
    // Check privacy to prevent leaking via websocket
    const projCheck = await db.get('SELECT is_public FROM projects WHERE name = ?', safeProjectName);
    const isPublicProject = projCheck ? projCheck.is_public : 1;
    newLog.is_public = isPublicProject;

    if (isPublicProject === 1) {
      io.emit('newLog', newLog);
    }
    
    res.json({ log: newLog });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/feed/:id/acknowledge', verifyToken, async (req, res) => {
  const id = req.params.id;
  try {
    await db.run('UPDATE logs SET status = ? WHERE id = ?', ['success', id]);
    io.emit('acknowledgeLog', id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/feed/:id/like', verifyToken, async (req, res) => {
  const logId = req.params.id;
  try {
    const user = await db.get('SELECT username FROM users WHERE id = ?', req.userId);
    if (!user) return res.status(404).json({error: "User not found"});

    const existing = await db.get('SELECT * FROM likes WHERE log_id = ? AND username = ?', [logId, user.username]);
    if (existing) {
      await db.run('DELETE FROM likes WHERE log_id = ? AND username = ?', [logId, user.username]);
    } else {
      await db.run('INSERT INTO likes (log_id, username) VALUES (?, ?)', [logId, user.username]);
      
      const log = await db.get('SELECT author FROM logs WHERE id = ?', logId);
      if (log && log.author !== user.username) {
        const notifRes = await db.run(
          'INSERT INTO notifications (recipient, actor, type, log_id) VALUES (?, ?, ?, ?)',
          [log.author, user.username, 'like', logId]
        );
        const notif = await db.get('SELECT * FROM notifications WHERE id = ?', notifRes.lastID);
        io.emit('newNotification', notif);
      }
    }
    
    const likes = await db.all('SELECT username FROM likes WHERE log_id = ?', [logId]);
    const likeUsers = likes.map(l => l.username);
    io.emit('likeUpdated', { logId: parseInt(logId), likes: likeUsers });
    
    res.json({ success: true, likes: likeUsers });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/feed/:id/comment', verifyToken, async (req, res) => {
  const logId = req.params.id;
  const { content, type } = req.body;
  try {
    const user = await db.get('SELECT username FROM users WHERE id = ?', req.userId);
    const commentType = type === 'solution' ? 'solution' : 'comment';
    
    const result = await db.run(
      'INSERT INTO comments (log_id, username, content, type) VALUES (?, ?, ?, ?)',
      [logId, user.username, content, commentType]
    );
    const newComment = await db.get('SELECT * FROM comments WHERE id = ?', result.lastID);
    
    // Notify log author
    const log = await db.get('SELECT author FROM logs WHERE id = ?', logId);
    if (log && log.author !== user.username) {
      const notifRes = await db.run(
        'INSERT INTO notifications (recipient, actor, type, log_id) VALUES (?, ?, ?, ?)',
        [log.author, user.username, 'comment', logId]
      );
      const notif = await db.get('SELECT * FROM notifications WHERE id = ?', notifRes.lastID);
      io.emit('newNotification', notif);
    }
    
    io.emit('newComment', { logId: parseInt(logId), comment: newComment });
    res.json({ success: true, comment: newComment });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/feed/:log_id/solution/:comment_id/accept', verifyToken, async (req, res) => {
  const { log_id, comment_id } = req.params;
  try {
    await db.run('UPDATE comments SET accepted = 1 WHERE id = ?', [comment_id]);
    await db.run('UPDATE logs SET status = ? WHERE id = ?', ['resolved', log_id]);
    
    io.emit('solutionAccepted', { logId: parseInt(log_id), commentId: parseInt(comment_id) });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/projects', verifyToken, async (req, res) => {
  const { name, isPublic } = req.body;
  const user = await db.get('SELECT username FROM users WHERE id = ?', req.userId);
  
  if (!name || name.trim() === '') {
    return res.status(400).json({ error: "Project name required" });
  }

  try {
    const safeName = name.trim();
    // Default sqlite true boolean is 1, false is 0
    const privacyFlag = isPublic ? 1 : 0; 
    
    await db.run('INSERT OR IGNORE INTO projects (name, owner, is_public) VALUES (?, ?, ?)', [safeName, user.username, privacyFlag]);
    
    // Only broadcast communal projects globally
    if (privacyFlag === 1) {
      io.emit('newProject', safeName);
    }
    
    res.json({ success: true, project: safeName });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function calculateStreak(dates) {
  if (dates.length === 0) return 0;
  
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  
  const dateSet = new Set(dates);
  
  if (!dateSet.has(todayStr) && !dateSet.has(yesterdayStr)) {
    return 0;
  }
  
  let streak = 0;
  let checkDate = dateSet.has(todayStr) ? today : yesterday;
  
  while (true) {
    const checkStr = checkDate.toISOString().split('T')[0];
    if (dateSet.has(checkStr)) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

function calculateLongestStreak(dates) {
  if (dates.length === 0) return 0;
  const parsedDates = [...new Set(dates)].map(d => new Date(d)).sort((a,b) => a - b);
  let longest = 0;
  let current = 0;
  let prevTime = null;
  
  for (const date of parsedDates) {
    date.setHours(0,0,0,0);
    if (prevTime === null) {
      current = 1;
    } else {
      const diffTime = Math.abs(date - prevTime);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        current++;
      } else if (diffDays > 1) {
        if (current > longest) longest = current;
        current = 1;
      }
    }
    prevTime = date;
  }
  if (current > longest) longest = current;
  return longest;
}

app.get('/api/dashboard', verifyToken, async (req, res) => {
  try {
    const user = await db.get('SELECT username, full_name, github_username, bio FROM users WHERE id = ?', [req.userId]);
    if (!user) return res.status(404).json({ error: "User not found" });
    const username = user.username;

    // 1. Streak and contributions
    const contribLogs = await db.all('SELECT DISTINCT strftime("%Y-%m-%d", timestamp) as date FROM logs WHERE author = ? ORDER BY date DESC', [username]);
    const dates = contribLogs.map(row => row.date);
    const currentStreak = calculateStreak(dates);
    const longestStreak = calculateLongestStreak(dates);
    const totalContributions = dates.length;

    // 2. Stats Cards
    const logsTodayRes = await db.get('SELECT COUNT(*) as count FROM logs WHERE author = ? AND date(timestamp) = date("now")', [username]);
    const likesReceivedRes = await db.get('SELECT COUNT(*) as count FROM likes WHERE log_id IN (SELECT id FROM logs WHERE author = ?)', [username]);
    const commentsReceivedRes = await db.get('SELECT COUNT(*) as count FROM comments WHERE log_id IN (SELECT id FROM logs WHERE author = ?)', [username]);
    const activeProjectsRes = await db.get('SELECT COUNT(*) as count FROM projects WHERE owner = ?', [username]);
    const followersCountRes = await db.get('SELECT COUNT(*) as count FROM followers WHERE followed = ?', [username]);
    const contribThisWeekRes = await db.get('SELECT COUNT(*) as count FROM logs WHERE author = ? AND timestamp >= date("now", "-7 days")', [username]);

    const stats = {
      currentStreak,
      longestStreak,
      totalContributions,
      logsToday: logsTodayRes ? logsTodayRes.count : 0,
      likesReceived: likesReceivedRes ? likesReceivedRes.count : 0,
      commentsReceived: commentsReceivedRes ? commentsReceivedRes.count : 0,
      activeProjects: activeProjectsRes ? activeProjectsRes.count : 0,
      followers: followersCountRes ? followersCountRes.count : 0,
      contributionsThisWeek: contribThisWeekRes ? contribThisWeekRes.count : 0
    };

    // 3. Recent Notifications
    const recentNotifications = await db.all(`
      SELECT n.*, l.title as log_title
      FROM notifications n
      LEFT JOIN logs l ON n.log_id = l.id
      WHERE n.recipient = ?
      ORDER BY n.timestamp DESC
      LIMIT 5
    `, [username]);

    // 4. Recent Followers
    const recentFollowers = await db.all(`
      SELECT u.username, u.full_name, u.github_username, IFNULL(u.bio, 'Observer of the Grid') as bio,
             EXISTS(SELECT 1 FROM followers WHERE follower = ? AND followed = u.username) as is_following
      FROM followers f
      JOIN users u ON f.follower = u.username
      WHERE f.followed = ?
      ORDER BY f.timestamp DESC
      LIMIT 5
    `, [username, username]);

    // 5. Recent Projects
    const recentProjects = await db.all(`
      SELECT p.*,
             COALESCE(MAX(l.timestamp), p.created_at) as last_updated,
             SUM(CASE WHEN l.status = 'error' THEN 1 ELSE 0 END) as open_issues,
             SUM(CASE WHEN l.status = 'resolved' THEN 1 ELSE 0 END) as resolved_issues,
             SUM(CASE WHEN l.status IN ('error', 'resolved') THEN 1 ELSE 0 END) as total_issues
      FROM projects p
      LEFT JOIN logs l ON p.name = l.project
      WHERE p.owner = ?
      GROUP BY p.name
      ORDER BY last_updated DESC
      LIMIT 5
    `, [username]);

    // 6. Trending Logs
    const trendingLogs = await db.all(`
      SELECT l.*,
             (SELECT COUNT(*) FROM likes WHERE log_id = l.id) as likes_count,
             (SELECT COUNT(*) FROM comments WHERE log_id = l.id) as comments_count,
             ((SELECT COUNT(*) FROM likes WHERE log_id = l.id) * 3 + (SELECT COUNT(*) FROM comments WHERE log_id = l.id) * 2) as score
      FROM logs l
      LEFT JOIN projects p ON l.project = p.name
      WHERE (l.project = 'Uncategorized' OR p.is_public = 1 OR p.owner = ?)
      ORDER BY score DESC, l.timestamp DESC
      LIMIT 5
    `, [username]);

    // 7. Activity Timeline
    const [pLogs, pComments, pFollows, pProjects, pAccepted] = await Promise.all([
      db.all('SELECT "post" as type, title, project, timestamp FROM logs WHERE author = ? ORDER BY timestamp DESC LIMIT 10', [username]),
      db.all('SELECT "comment" as type, c.content, c.type as comment_type, l.title as log_title, c.timestamp FROM comments c JOIN logs l ON c.log_id = l.id WHERE c.username = ? ORDER BY c.timestamp DESC LIMIT 10', [username]),
      db.all('SELECT "follow" as type, followed, timestamp FROM followers WHERE follower = ? ORDER BY timestamp DESC LIMIT 10', [username]),
      db.all('SELECT "project" as type, name as project_title, created_at as timestamp FROM projects WHERE owner = ? ORDER BY created_at DESC LIMIT 10', [username]),
      db.all('SELECT "accept_solution" as type, c.username as solver, l.title as log_title, c.timestamp FROM comments c JOIN logs l ON c.log_id = l.id WHERE l.author = ? AND c.accepted = 1 ORDER BY c.timestamp DESC LIMIT 10', [username])
    ]);
    
    const activityTimeline = [
      ...pLogs.map(item => ({ ...item })),
      ...pComments.map(item => ({ ...item })),
      ...pFollows.map(item => ({ ...item })),
      ...pProjects.map(item => ({ ...item })),
      ...pAccepted.map(item => ({ ...item }))
    ]
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 10);

    // 8. Suggested Developers
    const suggestedUsers = await db.all(`
      SELECT u.username, u.full_name, u.github_username, IFNULL(u.bio, 'Observer of the Grid') as bio,
        (SELECT COUNT(*) FROM followers f1 
         JOIN followers f2 ON f1.follower = f2.follower
         WHERE f1.followed = ? AND f2.followed = u.username) as mutual_count
      FROM users u
      WHERE u.username != ? 
        AND u.username NOT IN (SELECT followed FROM followers WHERE follower = ?)
      ORDER BY mutual_count DESC, u.id DESC
      LIMIT 5
    `, [username, username, username]);

    // 9. Analytics charts data
    const [aLogs, aLikes, aComments, aProj] = await Promise.all([
      db.all(`
        SELECT strftime('%W', timestamp) as week, COUNT(*) as count 
        FROM logs 
        WHERE author = ? AND timestamp >= date('now', '-28 days')
        GROUP BY week
        ORDER BY week ASC
      `, [username]),
      db.all(`
        SELECT strftime('%W', l.timestamp) as week, COUNT(lk.id) as count 
        FROM logs l
        JOIN likes lk ON l.id = lk.log_id
        WHERE l.author = ? AND l.timestamp >= date('now', '-28 days')
        GROUP BY week
        ORDER BY week ASC
      `, [username]),
      db.all(`
        SELECT strftime('%W', l.timestamp) as week, COUNT(c.id) as count 
        FROM logs l
        JOIN comments c ON l.id = c.log_id
        WHERE l.author = ? AND l.timestamp >= date('now', '-28 days')
        GROUP BY week
        ORDER BY week ASC
      `, [username]),
      db.all(`
        SELECT project, COUNT(*) as count
        FROM logs
        WHERE author = ? AND project != 'Uncategorized' AND project IS NOT NULL
        GROUP BY project
        ORDER BY count DESC
        LIMIT 5
      `, [username])
    ]);

    const getWeeklyArray = (weekRows) => {
      const arr = weekRows.map(r => r.count);
      while (arr.length < 4) arr.unshift(0);
      return arr.slice(-4);
    };

    const analytics = {
      logsPerWeek: getWeeklyArray(aLogs),
      likesPerWeek: getWeeklyArray(aLikes),
      commentsPerWeek: getWeeklyArray(aComments),
      projectActivity: aProj.map(r => ({ project: r.project, count: r.count }))
    };

    res.json({
      user,
      stats,
      recentNotifications,
      recentFollowers,
      recentProjects,
      trendingLogs,
      activityTimeline,
      suggestedUsers,
      analytics
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/notifications', verifyToken, async (req, res) => {
  try {
    const user = await db.get('SELECT username FROM users WHERE id = ?', req.userId);
    const notifications = await db.all('SELECT * FROM notifications WHERE recipient = ? ORDER BY timestamp DESC LIMIT 50', [user.username]);
    res.json({ notifications });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/notifications/read', verifyToken, async (req, res) => {
  try {
    const user = await db.get('SELECT username FROM users WHERE id = ?', req.userId);
    await db.run('UPDATE notifications SET is_read = 1 WHERE recipient = ?', [user.username]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/me', verifyToken, async (req, res) => {
  try {
    const user = await db.get('SELECT id, username FROM users WHERE id = ?', req.userId);
    res.json({ user, iat: req.iat }); 
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/users/search', verifyToken, async (req, res) => {
  const { q } = req.query;
  if (!q) return res.json({ users: [] });
  
  try {
    const currentUser = await db.get('SELECT username FROM users WHERE id = ?', req.userId);
    const users = await db.all(`
      SELECT u.username, COUNT(f.id) as followerCount 
      FROM users u 
      LEFT JOIN followers f ON u.username = f.followed 
      WHERE u.username LIKE ? AND u.username != ?
      GROUP BY u.username 
      LIMIT 10
    `, [`%${q}%`, currentUser.username]);
    
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/users/:username', verifyToken, async (req, res) => {
  const username = req.params.username.toLowerCase();
  try {
    const userProfile = await db.get(`
      SELECT id, username, full_name, bio, avatar_url, cover_url, skills, tech_stack, 
             github_link, linkedin_link, portfolio_link, company, college, location, created_at 
      FROM users WHERE username = ?`, [username]);
    if (!userProfile) return res.status(404).json({ error: "User not found" });

    const logCount = await db.get('SELECT COUNT(*) as count FROM logs WHERE author = ?', [username]);
    const followerCount = await db.get('SELECT COUNT(*) as count FROM followers WHERE followed = ?', [username]);
    const followingCount = await db.get('SELECT COUNT(*) as count FROM followers WHERE follower = ?', [username]);
    
    const currentUser = await db.get('SELECT username FROM users WHERE id = ?', [req.userId]);
    const currentUsername = currentUser ? currentUser.username : '';
    const isFollowing = currentUsername
      ? await db.get('SELECT 1 FROM followers WHERE follower = ? AND followed = ?', [currentUsername, username])
      : null;

    // Calculate Streaks
    const contribLogs = await db.all('SELECT DISTINCT strftime("%Y-%m-%d", timestamp) as date FROM logs WHERE author = ? ORDER BY date DESC', [username]);
    const dates = contribLogs.map(row => row.date);
    const currentStreak = calculateStreak(dates);
    const longestStreak = calculateLongestStreak(dates);

    // Calculate Languages and Most Used Technology
    const languagesRaw = await db.all(`
      SELECT language, COUNT(*) as count 
      FROM logs 
      WHERE author = ? AND language IS NOT NULL AND language != '' 
      GROUP BY language 
      ORDER BY count DESC`, [username]);
    const totalLangLogs = languagesRaw.reduce((sum, item) => sum + item.count, 0);
    const languages = languagesRaw.map(lang => ({
      name: lang.language,
      count: lang.count,
      percentage: totalLangLogs > 0 ? Math.round((lang.count / totalLangLogs) * 100) : 0
    }));
    const mostUsedTechnology = languages.length > 0 ? languages[0].name : "N/A";

    // Dynamic Achievements
    const achievements = [];
    const totalLogs = logCount.count;
    
    const solutionsAccepted = await db.get("SELECT COUNT(*) as count FROM comments WHERE username = ? AND accepted = 1", [username]);
    const solutionsAcceptedCount = solutionsAccepted ? solutionsAccepted.count : 0;
    
    const errorLogs = await db.get("SELECT COUNT(*) as count FROM logs WHERE author = ? AND status = 'error'", [username]);
    const errorLogsCount = errorLogs ? errorLogs.count : 0;
    
    const publicWorkspaces = await db.get("SELECT COUNT(*) as count FROM projects WHERE owner = ? AND is_public = 1", [username]);
    const publicWorkspacesCount = publicWorkspaces ? publicWorkspaces.count : 0;
    
    const totalWorkspaces = await db.get("SELECT COUNT(*) as count FROM projects WHERE owner = ?", [username]);
    const totalWorkspacesCount = totalWorkspaces ? totalWorkspaces.count : 0;

    if (totalLogs >= 1) {
      achievements.push({
        id: "pioneer",
        title: "Pioneer",
        description: "Engaged first log transmission on the Grid",
        icon: "🚀"
      });
    }
    if (errorLogsCount >= 1) {
      achievements.push({
        id: "bug_hunter",
        title: "Bug Hunter",
        description: "Diagnosed a critical system failure log",
        icon: "🐛"
      });
    }
    if (solutionsAcceptedCount >= 1) {
      achievements.push({
        id: "troubleshooter",
        title: "Troubleshooter",
        description: "Resolved a system incident with an accepted solution",
        icon: "🔧"
      });
    }
    if (followingCount.count >= 3) {
      achievements.push({
        id: "network_specialist",
        title: "Network Specialist",
        description: "Observing 3 or more nodes on the grid",
        icon: "📡"
      });
    }
    if (followerCount.count >= 5) {
      achievements.push({
        id: "team_leader",
        title: "Team Leader",
        description: "Observed by 5 or more observers",
        icon: "👥"
      });
    }
    if (totalLogs >= 10) {
      achievements.push({
        id: "code_warrior",
        title: "Code Warrior",
        description: "Committed 10 or more transmissions",
        icon: "⚔️"
      });
    }
    if (currentStreak >= 3) {
      achievements.push({
        id: "streak_master",
        title: "Streak Master",
        description: "Maintained a 3-day active transmission streak",
        icon: "🔥"
      });
    }
    if (publicWorkspacesCount >= 1) {
      achievements.push({
        id: "publicist",
        title: "Publicist",
        description: "Published a communal network workspace",
        icon: "🌐"
      });
    }
    if (totalWorkspacesCount >= 3) {
      achievements.push({
        id: "architect",
        title: "Architect",
        description: "Constructed 3 or more active workspaces",
        icon: "🏛️"
      });
    }

    // Pinned Projects
    const pinnedProjects = await db.all(`
      SELECT p.* FROM pinned_projects pp 
      JOIN projects p ON pp.project_name = p.name 
      WHERE pp.username = ?
      ORDER BY p.created_at DESC`, [username]);

    // Pinned Logs with metadata
    const pinnedLogsRaw = await db.all(`
      SELECT l.* FROM pinned_logs pl 
      JOIN logs l ON pl.log_id = l.id 
      WHERE pl.username = ?
      ORDER BY l.timestamp DESC`, [username]);
    
    const pinnedLogs = [];
    if (pinnedLogsRaw.length > 0) {
      const logIds = pinnedLogsRaw.map(l => l.id);
      const placeholders = logIds.map(() => '?').join(',');
      const comments = await db.all(`SELECT * FROM comments WHERE log_id IN (${placeholders})`, logIds);
      const likes = await db.all(`SELECT log_id, username FROM likes WHERE log_id IN (${placeholders})`, logIds);
      
      pinnedLogsRaw.forEach(log => {
        pinnedLogs.push({
          ...log,
          comments: comments.filter(c => c.log_id === log.id),
          likes: likes.filter(l => l.log_id === log.id).map(l => l.username)
        });
      });
    }

    res.json({
      ...userProfile,
      stats: {
        logs: logCount.count,
        followers: followerCount.count,
        following: followingCount.count,
        currentStreak,
        longestStreak
      },
      isFollowing: !!isFollowing,
      achievements,
      languages,
      mostUsedTechnology,
      pinnedProjects,
      pinnedLogs
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update profile details and avatars
app.put('/api/users/profile', verifyToken, upload.fields([{ name: 'avatar', maxCount: 1 }, { name: 'cover', maxCount: 1 }]), async (req, res) => {
  const { full_name, bio, skills, tech_stack, github_link, linkedin_link, portfolio_link, company, college, location } = req.body;
  try {
    const user = await db.get('SELECT username, avatar_url, cover_url FROM users WHERE id = ?', [req.userId]);
    if (!user) return res.status(404).json({ error: "User not found" });

    let avatarUrl = req.body.avatar_url || user.avatar_url;
    let coverUrl = req.body.cover_url || user.cover_url;

    if (req.files) {
      if (req.files['avatar'] && req.files['avatar'][0]) {
        avatarUrl = `/uploads/${req.files['avatar'][0].filename}`;
      }
      if (req.files['cover'] && req.files['cover'][0]) {
        coverUrl = `/uploads/${req.files['cover'][0].filename}`;
      }
    }

    await db.run(`
      UPDATE users 
      SET full_name = ?, bio = ?, skills = ?, tech_stack = ?, github_link = ?, 
          linkedin_link = ?, portfolio_link = ?, company = ?, college = ?, location = ?,
          avatar_url = ?, cover_url = ?
      WHERE id = ?`,
      [
        full_name === undefined ? null : full_name,
        bio === undefined ? null : bio,
        skills === undefined ? null : skills,
        tech_stack === undefined ? null : tech_stack,
        github_link === undefined ? null : github_link,
        linkedin_link === undefined ? null : linkedin_link,
        portfolio_link === undefined ? null : portfolio_link,
        company === undefined ? null : company,
        college === undefined ? null : college,
        location === undefined ? null : location,
        avatarUrl === undefined ? null : avatarUrl,
        coverUrl === undefined ? null : coverUrl,
        req.userId
      ]
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Pinning/Unpinning Workspaces
app.post('/api/users/pins/project', verifyToken, async (req, res) => {
  const { name } = req.body;
  try {
    const user = await db.get('SELECT username FROM users WHERE id = ?', req.userId);
    const count = await db.get('SELECT COUNT(*) as count FROM pinned_projects WHERE username = ?', [user.username]);
    if (count.count >= 6) {
      return res.status(400).json({ error: "Maximum of 6 pinned projects allowed" });
    }
    await db.run('INSERT OR IGNORE INTO pinned_projects (username, project_name) VALUES (?, ?)', [user.username, name]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/users/pins/project', verifyToken, async (req, res) => {
  const { name } = req.body;
  try {
    const user = await db.get('SELECT username FROM users WHERE id = ?', req.userId);
    await db.run('DELETE FROM pinned_projects WHERE username = ? AND project_name = ?', [user.username, name]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Pinning/Unpinning Transmissions (Logs)
app.post('/api/users/pins/log', verifyToken, async (req, res) => {
  const { id } = req.body;
  try {
    const user = await db.get('SELECT username FROM users WHERE id = ?', req.userId);
    const count = await db.get('SELECT COUNT(*) as count FROM pinned_logs WHERE username = ?', [user.username]);
    if (count.count >= 6) {
      return res.status(400).json({ error: "Maximum of 6 pinned logs allowed" });
    }
    await db.run('INSERT OR IGNORE INTO pinned_logs (username, log_id) VALUES (?, ?)', [user.username, id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/users/pins/log', verifyToken, async (req, res) => {
  const { id } = req.body;
  try {
    const user = await db.get('SELECT username FROM users WHERE id = ?', req.userId);
    await db.run('DELETE FROM pinned_logs WHERE username = ? AND log_id = ?', [user.username, id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/users/:username/contributions', verifyToken, async (req, res) => {
    const username = req.params.username.toLowerCase();
    try {
        // Get contribution counts for the last 365 days
        const contributions = await db.all(`
            SELECT strftime('%Y-%m-%d', timestamp) as date, COUNT(*) as count 
            FROM logs 
            WHERE author = ? AND timestamp >= date('now', '-365 days')
            GROUP BY date
        `, [username]);
        
        res.json({ contributions });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/users/:username/follow', verifyToken, async (req, res) => {
    const username = req.params.username.toLowerCase();
    try {
        const currentUser = await db.get('SELECT username FROM users WHERE id = ?', [req.userId]);
        if (currentUser.username === username) return res.status(400).json({ error: "Cannot follow self" });

        await db.run('INSERT OR IGNORE INTO followers (follower, followed) VALUES (?, ?)', [currentUser.username, username]);
        
        // Notify the user they have a new follower
        await db.run(
            'INSERT INTO notifications (recipient, actor, type) VALUES (?, ?, ?)',
            [username, currentUser.username, 'follow']
        );
        const notif = await db.get('SELECT * FROM notifications WHERE id = (SELECT last_insert_rowid())');
        io.emit('newNotification', notif);

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/users/:username/follow', verifyToken, async (req, res) => {
    const username = req.params.username.toLowerCase();
    try {
        const currentUser = await db.get('SELECT username FROM users WHERE id = ?', [req.userId]);
        await db.run('DELETE FROM followers WHERE follower = ? AND followed = ?', [currentUser.username, username]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

initializeDB().then(() => {
  server.listen(PORT, () => {
    console.log(`Secured RawProcess Server & Media Sync running on http://localhost:${PORT}`);
  });
});
