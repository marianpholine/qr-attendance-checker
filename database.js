const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
  constructor() {
    this.db = new sqlite3.Database(path.join(__dirname, 'attendance.db'));
  }

  init() {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        this.db.run(`
          CREATE TABLE IF NOT EXISTS sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sessionId TEXT UNIQUE NOT NULL,
            className TEXT NOT NULL,
            instructor TEXT NOT NULL,
            date TEXT NOT NULL,
            location TEXT NOT NULL,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            expiresAt DATETIME NOT NULL
          )
        `, (err) => {
          if (err) return reject(err);
        });

        this.db.run(`
          CREATE TABLE IF NOT EXISTS attendance (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sessionId TEXT NOT NULL,
            studentId TEXT NOT NULL,
            studentName TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'Present',
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(sessionId, studentId),
            FOREIGN KEY(sessionId) REFERENCES sessions(sessionId)
          )
        `, (err) => {
          if (err) return reject(err);
          resolve();
        });
      });
    });
  }

  createSession({ sessionId, className, instructor, date, location, expiresAt }) {
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO sessions (sessionId, className, instructor, date, location, expiresAt)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [sessionId, className, instructor, date, location, expiresAt],
        (err) => {
          if (err) return reject(err);
          resolve();
        }
      );
    });
  }

  getSessionById(sessionId) {
    return new Promise((resolve, reject) => {
      this.db.get(
        `SELECT * FROM sessions WHERE sessionId = ?`,
        [sessionId],
        (err, row) => {
          if (err) return reject(err);
          resolve(row);
        }
      );
    });
  }

  checkAttendance(sessionId, studentId) {
    return new Promise((resolve, reject) => {
      this.db.get(
        `SELECT * FROM attendance WHERE sessionId = ? AND studentId = ?`,
        [sessionId, studentId],
        (err, row) => {
          if (err) return reject(err);
          resolve(row || null);
        }
      );
    });
  }

  recordAttendance({ sessionId, studentId, studentName, status }) {
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO attendance (sessionId, studentId, studentName, status)
         VALUES (?, ?, ?, ?)`,
        [sessionId, studentId, studentName, status],
        function (err) {
          if (err) return reject(err);
          resolve(this.lastID);
        }
      );
    });
  }

  getAttendanceBySession(sessionId) {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT * FROM attendance WHERE sessionId = ? ORDER BY timestamp DESC`,
        [sessionId],
        (err, rows) => {
          if (err) return reject(err);
          resolve(rows || []);
        }
      );
    });
  }
}

module.exports = Database;
