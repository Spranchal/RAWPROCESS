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
      password TEXT NOT NULL
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
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
  const normalizedUsername = username.toLowerCase();

  try {
    const existing = await db.get('SELECT * FROM users WHERE username = ?', normalizedUsername);
    if (existing) return res.status(409).json({ error: 'Observer_ID already engaged' });

    const hash = await bcrypt.hash(password, 10);
    const result = await db.run('INSERT INTO users (username, password) VALUES (?, ?)', [normalizedUsername, hash]);
    
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
  const { title, content, status, project } = req.body;
  const user = await db.get('SELECT username FROM users WHERE id = ?', req.userId);
  
  if (!title || !content || !status) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  
  const safeProjectName = project || 'Uncategorized';
  const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

  try {
    const result = await db.run(
      'INSERT INTO logs (title, content, status, imageUrl, project, author) VALUES (?, ?, ?, ?, ?, ?)',
      [title, content, status, imageUrl, safeProjectName, user.username]
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

app.get('/api/users/:username', verifyToken, async (req, res) => {
  const { username } = req.params;
  try {
    const userProfile = await db.get('SELECT username FROM users WHERE username = ?', [username]);
    if (!userProfile) return res.status(404).json({ error: "User not found" });

    const logCount = await db.get('SELECT COUNT(*) as count FROM logs WHERE author = ?', [username]);
    const followerCount = await db.get('SELECT COUNT(*) as count FROM followers WHERE followed = ?', [username]);
    const followingCount = await db.get('SELECT COUNT(*) as count FROM followers WHERE follower = ?', [username]);
    
    const currentUser = await db.get('SELECT username FROM users WHERE id = ?', [req.userId]);
    const isFollowing = await db.get('SELECT 1 FROM followers WHERE follower = ? AND followed = ?', [currentUser.username, username]);

    res.json({
      username: userProfile.username,
      stats: {
        logs: logCount.count,
        followers: followerCount.count,
        following: followingCount.count
      },
      isFollowing: !!isFollowing
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/users/:username/contributions', verifyToken, async (req, res) => {
    const { username } = req.params;
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
    const { username } = req.params;
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
    const { username } = req.params;
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
