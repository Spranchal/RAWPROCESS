const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./server/database.sqlite');

db.serialize(() => {
    console.log("--- LOGS SUMMARY ---");
    db.each("SELECT author, COUNT(*) as count FROM logs GROUP BY author", (err, row) => {
        if (err) console.error(err);
        else console.log(`${row.author}: ${row.count} logs`);
    });

    console.log("\n--- USERS SUMMARY ---");
    db.each("SELECT username FROM users", (err, row) => {
        if (err) console.error(err);
        else console.log(`User: ${row.username}`);
    });

    console.log("\n--- RECENT LOG DETAILS ---");
    db.each("SELECT id, author, timestamp, project FROM logs ORDER BY id DESC LIMIT 5", (err, row) => {
        if (err) console.error(err);
        else console.log(`ID: ${row.id}, Author: ${row.author}, Time: ${row.timestamp}, Proj: ${row.project}`);
    });
});

db.close();
