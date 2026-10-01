const form = document.getElementById('attendance-form');
const qrImage = document.getElementById('qr-image');
const qrPlaceholder = document.getElementById('qr-placeholder');
const qrMeta = document.getElementById('qr-meta');
const downloadBtn = document.getElementById('download-qr');
const printBtn = document.getElementById('print-qr');
const attendanceList = document.getElementById('attendance-list');

const setToday = () => {
  const dateInput = document.getElementById('date');
  if (!dateInput.value) {
    dateInput.value = new Date().toISOString().slice(0, 10);
  }
};

setToday();

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const payload = {
    className: document.getElementById('className').value,
    instructor: document.getElementById('instructor').value,
    date: document.getElementById('date').value,
    location: document.getElementById('location').value
  };

  const response = await fetch('/api/teacher/generate-qr', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const result = await response.json();

  if (!result.success) {
    alert(result.message || 'Unable to generate QR code.');
    return;
  }

  qrPlaceholder.classList.add('hidden');
  qrImage.src = result.qrCode;
  qrImage.classList.remove('hidden');
  qrMeta.classList.remove('hidden');
  qrMeta.innerHTML = `
    <strong>Class:</strong> ${payload.className}<br>
    <strong>Teacher:</strong> ${payload.instructor}<br>
    <strong>Date:</strong> ${payload.date}<br>
    <strong>Location:</strong> ${payload.location}
  `;
  downloadBtn.classList.remove('hidden');
  printBtn.classList.remove('hidden');

  downloadBtn.onclick = () => {
    const a = document.createElement('a');
    a.href = result.qrCode;
    a.download = `${payload.className.replace(/\s+/g, '-').toLowerCase()}-qr.png`;
    a.click();
  };

  printBtn.onclick = () => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <body style="font-family: sans-serif; text-align: center; padding: 30px;">
          <h2>${payload.className}</h2>
          <img src="${result.qrCode}" style="max-width: 420px; width: 100%;" />
          <p>Teacher: ${payload.instructor}</p>
          <p>Date: ${payload.date}</p>
          <p>Location: ${payload.location}</p>
        </body>
      </html>
    `);
    printWindow.focus();
    printWindow.print();
  };

  // Load attendance immediately and refresh every 5 seconds
  const loadAttendance = async () => {
    const res = await fetch(`/api/teacher/attendance/${result.sessionId}`);
    const data = await res.json();

    if (!data.success) {
      attendanceList.innerHTML = '<p>Attendance data unavailable.</p>';
      return;
    }

    const records = data.records || [];

    if (!records.length) {
      attendanceList.innerHTML = '<p>No attendance recorded yet.</p>';
      return;
    }

    attendanceList.innerHTML = records
      .map((record) => `
        <div class="attendance-item">
          <div>
            <strong>${record.studentName}</strong>
            <span>${record.studentId}</span>
          </div>
          <div>
            <span>${new Date(record.timestamp).toLocaleTimeString()}</span>
            <div class="status-item">${record.status}</div>
          </div>
        </div>
      `)
      .join('');
  };

  loadAttendance();
  setInterval(loadAttendance, 5000);
});
