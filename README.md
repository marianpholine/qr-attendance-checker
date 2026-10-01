const html5QrCode = new Html5Qrcode('reader');
const startBtn = document.getElementById('start-scan');
const stopBtn = document.getElementById('stop-scan');
const statusBox = document.getElementById('status-box');

let scanning = false;

startBtn.addEventListener('click', async () => {
  try {
    await html5QrCode.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 250, height: 250 } },
      onScanSuccess,
      onScanError
    );

    scanning = true;
    startBtn.classList.add('hidden');
    stopBtn.classList.remove('hidden');
  } catch (error) {
    console.error(error);
    setStatus('Unable to access camera. Please allow camera permission.', 'error');
  }
});

stopBtn.addEventListener('click', async () => {
  if (html5QrCode.isScanning) {
    await html5QrCode.stop();
    scanning = false;
    startBtn.classList.remove('hidden');
    stopBtn.classList.add('hidden');
  }
});

function onScanError() {
  // ignore repeated scanning errors
}

async function onScanSuccess(decodedText) {
  if (!scanning) return;

  try {
    const qrData = JSON.parse(decodedText);
    if (!qrData.sessionId) {
      throw new Error('Invalid QR payload');
    }

    await html5QrCode.stop();
    scanning = false;
    startBtn.classList.remove('hidden');
    stopBtn.classList.add('hidden');

    const studentName = prompt('Enter your full name to register attendance:');
    if (!studentName || !studentName.trim()) {
      setStatus('Attendance was not recorded because no name was entered.', 'error');
      return;
    }

    const studentId = 'STU-' + Math.random().toString(36).slice(2, 10).toUpperCase();

    setStatus('Submitting your attendance...', 'neutral');

    const response = await fetch('/api/student/mark-attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: qrData.sessionId,
        studentId,
        studentName: studentName.trim()
      })
    });

    const result = await response.json();

    if (result.success) {
      setStatus(
        `Present recorded for ${studentName.trim()}<br><strong>${result.session.className}</strong><br>${result.session.instructor} · ${result.session.date}`,
        'success'
      );
    } else {
      setStatus(result.message || 'Attendance could not be recorded.', 'error');
    }
  } catch (error) {
    console.error(error);
    setStatus('This is not a valid attendance QR code.', 'error');
  }
}

function setStatus(message, type) {
  statusBox.className = `status-box ${type}`;
  statusBox.innerHTML = `<p>${message}</p>`;
}
