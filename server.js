const express = require('express');
const path = require('path');
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const Database = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;
const db = new Database();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Initialize SQLite DB
(async () => {
  await db.init();
})();

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/teacher', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'teacher.html'));
});

app.get('/student', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'student.html'));
});

app.post('/api/teacher/generate-qr', async (req, res) => {
  try {
    const { className, instructor, date, location } = req.body;

    if (!className || !instructor || !date || !location) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required.'
      });
    }

    const sessionId = uuidv4();
    const expiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString();

    await db.createSession({
      sessionId,
      className,
      instructor,
      date,
      location,
      expiresAt
    });

    const qrPayload = JSON.stringify({
      sessionId,
      className,
      instructor,
      date,
      location
    });

    const qrCode = await QRCode.toDataURL(qrPayload, {
      errorCorrectionLevel: 'H',
      margin: 2,
      width: 500,
      color: { dark: '#111827', light: '#ffffff' }
    });

    return res.json({
      success: true,
      sessionId,
      qrCode,
      expiresAt,
      message: 'QR code successfully generated for this class.'
    });
  } catch (error) {
    console.error('generate-qr error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate QR code.'
    });
  }
});

app.get('/api/teacher/attendance/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await db.getSessionById(sessionId);
    const records = await db.getAttendanceBySession(sessionId);

    return res.json({
      success: true,
      session,
      attendanceCount: records.length,
      records
    });
  } catch (error) {
    console.error('attendance fetch error:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to fetch attendance records.'
    });
  }
});

app.post('/api/student/mark-attendance', async (req, res) => {
  try {
    const { sessionId, studentId, studentName } = req.body;

    if (!sessionId || !studentId || !studentName) {
      return res.status(400).json({
        success: false,
        message: 'QR data is incomplete.'
      });
    }

    const session = await db.getSessionById(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Invalid QR code or session not found.'
      });
    }

    const expiresAt = new Date(session.expiresAt);
    if (new Date() > expiresAt) {
      return res.status(400).json({
        success: false,
        message: 'This QR code has expired. Please ask the teacher for a new one.'
      });
    }

    const alreadyMarked = await db.checkAttendance(sessionId, studentId);
    if (alreadyMarked) {
      return res.status(409).json({
        success: false,
        message: `${studentName} has already been marked present for this session.`
      });
    }

    await db.recordAttendance({
      sessionId,
      studentId,
      studentName,
      status: 'Present'
    });

    return res.json({
      success: true,
      message: `Attendance recorded successfully for ${studentName}.`,
      session: {
        className: session.className,
        instructor: session.instructor,
        date: session.date,
        location: session.location
      }
    });
  } catch (error) {
    console.error('mark-attendance error:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to save attendance.'
    });
  }
});

app.listen(PORT, () => {
  console.log(`QR Attendance System running at http://localhost:${PORT}`);
  console.log(`Teacher dashboard: http://localhost:${PORT}/teacher`);
  console.log(`Student scanner: http://localhost:${PORT}/student`);
});
