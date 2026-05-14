// DYNAMIC API URL SETUP
const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? '/api'
  : 'https://final-project-the-survivors-bsit2a-6cdr.onrender.com/api';

document.addEventListener('DOMContentLoaded', function () {
  const token = localStorage.getItem('token');
  const user = localStorage.getItem('currentUser');

  if (!token || !user) {
    window.location.href = 'login.html';
    return;
  }

  const userData = JSON.parse(user);
  if (userData.role !== 'teacher' && userData.role !== 'admin') {
    alert('Access denied. Teachers only.');
    window.location.href = 'index.html';
    return;
  }

  document.getElementById('teacherName').textContent = userData.username || 'Teacher';

  document.getElementById('logoutBtn')?.addEventListener('click', function () {
    localStorage.removeItem('token');
    localStorage.removeItem('currentUser');
    window.location.href = 'login.html';
  });

  // Tab switching
  window.switchTab = function (evt, tabName) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));

    evt.currentTarget.classList.add('active');
    document.getElementById(tabName + 'Tab').classList.add('active');

    if (tabName === 'schedule') loadSchedule();
    if (tabName === 'sessions') loadActiveSessions();
    if (tabName === 'records') loadAttendance();
  };

  // ── Session Management (NEW) ────────────────────────────────

  // Pre-fill today's date in the session form
  const dateInput = document.getElementById('sessionDate');
  if (dateInput) {
    dateInput.value = new Date().toISOString().split('T')[0];
  }

  async function loadActiveSessions() {
    const grid = document.getElementById('activeSessionsGrid');
    if (!grid) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await fetch(`${API_URL}/sessions?startDate=${today}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();

      if (!response.ok || !data.data || data.data.length === 0) {
        grid.innerHTML = '<p class="text-muted text-center p-3">No active sessions right now.</p>';
        return;
      }

      const openSessions = data.data.filter(s => s.status === 'open');

      if (openSessions.length === 0) {
        grid.innerHTML = '<p class="text-muted text-center p-3">No active sessions right now.</p>';
        return;
      }

      grid.innerHTML = openSessions.map(session => {
        const date = new Date(session.sessionDate).toLocaleDateString();
        const time = `${session.startTime} - ${session.endTime}`;
        return `
          <div class="session-card p-3 border rounded bg-light d-flex justify-content-between align-items-center">
            <div>
              <h4 class="mb-1 text-primary">${session.className}</h4>
              <p class="mb-0 text-secondary">
                <i class="fas fa-calendar-alt me-1"></i> ${date} | 
                <i class="fas fa-clock me-1"></i> ${time}
              </p>
            </div>
            <button class="btn btn-danger" onclick="closeSession('${session._id}', '${session.className}')">
              <i class="fas fa-stop-circle me-1"></i> Close Session
            </button>
          </div>
        `;
      }).join('');
    } catch (error) {
      console.error('Error loading sessions:', error);
      grid.innerHTML = '<p class="text-danger text-center">Failed to load active sessions.</p>';
    }
  }

  const startSessionForm = document.getElementById('startSessionForm');
  if (startSessionForm) {
    startSessionForm.addEventListener('submit', async function (e) {
      e.preventDefault();

      const submitBtn = startSessionForm.querySelector('button[type="submit"]');
      const originalText = submitBtn.innerHTML;
      submitBtn.innerHTML = 'Opening...';
      submitBtn.disabled = true;

      const payload = {
        className: document.getElementById('sessionClassName').value,
        sessionDate: document.getElementById('sessionDate').value,
        startTime: document.getElementById('sessionStartTime').value,
        endTime: document.getElementById('sessionEndTime').value,
        allowanceMinutes: parseInt(document.getElementById('sessionAllowance').value) || 5
      };

      try {
        const response = await fetch(`${API_URL}/sessions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (response.ok) {
          alert('✅ Session Opened Successfully! Students can now check in.');
          startSessionForm.reset();
          document.getElementById('sessionDate').value = new Date().toISOString().split('T')[0]; // reset date
          loadActiveSessions();
        } else {
          alert(`❌ Failed: ${data.message}`);
        }
      } catch (error) {
        console.error('Error starting session:', error);
        alert('❌ Cannot connect to server.');
      } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
      }
    });
  }

  window.closeSession = async function (sessionId, className) {
    if (!confirm(`Are you sure you want to close "${className}"?\n\nAny student enrolled in the roster who has not checked in will be automatically marked as ABSENT.`)) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/sessions/${sessionId}/close`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (response.ok) {
        alert(`✅ Session Closed.\n${data.absencesCreated || 0} students were automatically marked as Absent.`);
        loadActiveSessions();
        loadAttendance(); // Refresh records to show new absentees
        loadStats();      // Refresh stats
      } else {
        alert(`❌ Failed to close session: ${data.message}`);
      }
    } catch (error) {
      console.error('Error closing session:', error);
      alert('❌ Cannot connect to server.');
    }
  };


  // ── Attendance Records ──────────────────────────────────────

  async function loadAttendance() {
    const tableBody = document.getElementById('attendanceTableBody');
    if (!tableBody) return;

    tableBody.innerHTML = '<tr><td colspan="6" class="text-center">Loading...</td></tr>';

    try {
      const response = await fetch(`${API_URL}/attendance`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();

      if (!response.ok) {
        tableBody.innerHTML = `<tr><td colspan="6" class="text-center text-danger">${data.message}</td></tr>`;
        return;
      }

      if (!data.data || data.data.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" class="text-center">No attendance records yet</td></tr>';
        return;
      }

      tableBody.innerHTML = data.data.map(record => {
        const date = new Date(record.timeIn).toLocaleDateString();
        // Handle automatically generated absences which might not have a useful timeIn
        const time = record.markedByAdmin && record.status === 'Absent' ? '--:--' : new Date(record.timeIn).toLocaleTimeString();

        let statusClass = 'badge-secondary';
        if (record.status === 'Early') statusClass = 'bg-success';
        if (record.status === 'On-Time') statusClass = 'bg-primary';
        if (record.status === 'Late') statusClass = 'bg-warning text-dark';
        if (record.status === 'Absent') statusClass = 'bg-danger';

        const studentName = record.user?.username || record.studentId || 'Unknown';
        const autoTag = record.markedByAdmin ? ' <small class="text-white-50">(Auto)</small>' : '';

        return `
          <tr>
            <td>${studentName}</td>
            <td>${record.studentId || 'N/A'}</td>
            <td>${date}</td>
            <td>${time}</td>
            <td><span class="badge ${statusClass}">${record.status}${autoTag}</span></td>
            <td>
              <button class="btn btn-sm btn-info" onclick="viewDetails('${record._id}')">View</button>
            </td>
          </tr>
        `;
      }).join('');

    } catch (error) {
      console.error('Error loading attendance:', error);
      tableBody.innerHTML = '<tr><td colspan="6" class="text-center text-danger">Failed to load data</td></tr>';
    }
  }

  // ── Stats ───────────────────────────────────────────────────

  async function loadStats() {
    try {
      const response = await fetch(`${API_URL}/attendance/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();
      if (!data.data) return;

      document.getElementById('statEarly').textContent = data.data.today.Early || 0;
      document.getElementById('statOnTime').textContent = data.data.today['On-Time'] || 0;
      document.getElementById('statLate').textContent = data.data.today.Late || 0;
      document.getElementById('statAbsent').textContent = data.data.today.Absent || 0;
      document.getElementById('statTotal').textContent = data.data.total || 0;

    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }

  // ── Student Summary ─────────────────────────────────────────

  async function loadStudentSummary() {
    const grid = document.getElementById('studentSummaryGrid');
    if (!grid) return;

    try {
      const response = await fetch(`${API_URL}/attendance/student-summary`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();

      if (!response.ok || !result.data || result.data.length === 0) {
        grid.innerHTML = '<div class="text-center w-100 p-3">No student activity data available.</div>';
        return;
      }
      renderStudentCards(result.data);
    } catch (error) {
      grid.innerHTML = '<div class="text-center text-danger w-100 p-3">Failed to load student data.</div>';
    }
  }

  function renderStudentCards(students) {
    const grid = document.getElementById('studentSummaryGrid');
    if (!grid) return;

    // Using the same rendering logic you previously had
    grid.innerHTML = students.map(student => {
      const total = student.total || 1;
      const earlyPct = ((student.Early / total) * 100).toFixed(1);
      const absentPct = ((student.Absent / total) * 100).toFixed(1);

      return `
        <div class="student-card p-3 border rounded mb-2">
          <h4>${student.studentName}</h4>
          <div class="text-muted">ID: ${student.studentId}</div>
          <div class="mt-2">
            <span class="badge bg-success">Early: ${student.Early}</span>
            <span class="badge bg-primary">On-Time: ${student['On-Time']}</span>
            <span class="badge bg-warning text-dark">Late: ${student.Late}</span>
            <span class="badge bg-danger">Absent: ${student.Absent}</span>
          </div>
        </div>
      `;
    }).join('');
  }

  // ── Legacy Class Schedule ───────────────────────────────────
  async function loadSchedule() {
    try {
      const response = await fetch(`${API_URL}/schedule`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.data) {
        document.getElementById('className').value = data.data.className || '';
        document.getElementById('startTime').value = data.data.startTime || '';
        document.getElementById('endTime').value = data.data.endTime || '';
        document.getElementById('allowanceTime').value = data.data.allowanceMinutes ?? 5;
      }
    } catch (error) {
      console.error('Error loading schedule:', error);
    }
  }

  document.getElementById('scheduleForm')?.addEventListener('submit', async function (e) {
    e.preventDefault();
    const payload = {
      className: document.getElementById('className').value,
      startTime: document.getElementById('startTime').value,
      endTime: document.getElementById('endTime').value,
      allowanceMinutes: parseInt(document.getElementById('allowanceTime').value)
    };

    try {
      const response = await fetch(`${API_URL}/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      if (response.ok) alert('✅ Legacy schedule saved.');
    } catch (err) {
      alert('❌ Cannot connect to server.');
    }
  });

  // ── View Details ────────────────────────────────────────────
  window.viewDetails = async function (id) {
    try {
      const response = await fetch(`${API_URL}/attendance/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        const record = data.data;
        alert(`Student: ${record.user?.username || record.studentId}\nStatus: ${record.status}\nSubject: ${record.subject || 'General'}\nNotes: ${record.notes || 'None'}`);
      }
    } catch (error) {
      alert('Failed to load details');
    }
  };

  // ── Init ────────────────────────────────────────────────────
  loadActiveSessions();
  loadAttendance();
  loadStats();
  loadStudentSummary();
});