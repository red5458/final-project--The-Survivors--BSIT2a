// DYNAMIC API URL SETUP (Ensures it works on local and Render)
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
  if (userData.role !== 'student') {
    alert('Access denied. Students only.');
    window.location.href = 'index.html';
    return;
  }

  document.getElementById('studentName').textContent = userData.username || 'Student';
  document.getElementById('studentId').textContent = userData.studentId || 'N/A';

  document.getElementById('logoutBtn')?.addEventListener('click', function () {
    localStorage.removeItem('token');
    localStorage.removeItem('currentUser');
    window.location.href = 'login.html';
  });

  // Load available sessions
  async function loadAvailableSessions() {
    const container = document.getElementById('availableSessionsContainer');
    if (!container) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await fetch(`${API_URL}/sessions?startDate=${today}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();

      if (!response.ok || !data.data || data.data.length === 0) {
        container.innerHTML = '<p class="text-muted">No sessions available today.</p>';
        return;
      }

      const openSessions = data.data.filter(s => s.status === 'open');

      if (openSessions.length === 0) {
        container.innerHTML = '<p class="text-muted">No open sessions right now. Waiting for the teacher to start class...</p>';
        return;
      }

      container.innerHTML = `
        <div class="sessions-list d-flex flex-column gap-3">
          ${openSessions.map(session => {
        const date = new Date(session.sessionDate);
        const time = `${session.startTime} - ${session.endTime}`;
        return `
              <div class="session-card p-3 border rounded bg-light">
                <h4 class="mb-2 text-primary">${session.className}</h4>
                <p class="mb-1 text-secondary">
                  <i class="fas fa-calendar-alt me-1"></i> ${date.toLocaleDateString()} | 
                  <i class="fas fa-clock me-1"></i> ${time}
                </p>
                <p class="mb-3 text-muted small">Grace period: ${session.allowanceMinutes} minutes</p>
                <button class="btn btn-success" onclick="quickCheckIn('${session._id}', '${session.className}')">
                  <i class="fas fa-check-circle me-1"></i> Check In to This Class
                </button>
              </div>
            `;
      }).join('')}
        </div>
      `;
    } catch (error) {
      console.error('Error loading sessions:', error);
      container.innerHTML = '<p class="text-danger">Failed to load available sessions.</p>';
    }
  }

  // Quick check-in to a specific session
  window.quickCheckIn = async function (sessionId, className) {
    const token = localStorage.getItem('token');

    try {
      const response = await fetch(`${API_URL}/attendance/checkin-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          sessionId,
          subject: className,
          notes: 'Checked in via Student Dashboard'
        })
      });

      const data = await response.json();

      if (!response.ok) {
        // Specifically look for the "Not enrolled" error from the backend
        if (response.status === 403) {
          alert(`❌ You cannot check in because you are not enrolled in ${className}.`);
        } else {
          alert(`❌ ${data.message || 'Check-in failed'}`);
        }
        return;
      }

      alert(`✅ Check-in successful!\nStatus: ${data.data.status}\nClass: ${className}`);

      // Refresh the UI
      loadAttendanceHistory();
      loadStats();
      loadAvailableSessions();

    } catch (error) {
      console.error('Check-in error:', error);
      alert('❌ Cannot connect to server.');
    }
  };

  async function loadAttendanceHistory() {
    const tableBody = document.getElementById('attendanceTableBody');
    if (!tableBody) return;

    tableBody.innerHTML = '<tr><td colspan="4" class="text-center">Loading...</td></tr>';

    try {
      const response = await fetch(`${API_URL}/attendance/my-attendance`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();

      if (!response.ok) {
        tableBody.innerHTML = `<tr><td colspan="4" class="text-center text-danger">${data.message}</td></tr>`;
        return;
      }

      if (!data.data || data.data.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="4" class="text-center">No attendance records yet</td></tr>';
        return;
      }

      tableBody.innerHTML = data.data.map(record => {
        const date = new Date(record.timeIn).toLocaleDateString();
        const time = new Date(record.timeIn).toLocaleTimeString();

        let badgeColor = 'bg-secondary';
        if (record.status === 'Early') badgeColor = 'bg-success';
        if (record.status === 'On-Time') badgeColor = 'bg-primary';
        if (record.status === 'Late') badgeColor = 'bg-warning text-dark';
        if (record.status === 'Absent') badgeColor = 'bg-danger';

        return `
          <tr>
            <td>${date}</td>
            <td>${time}</td>
            <td><span class="badge ${badgeColor}">${record.status}</span></td>
            <td>${record.subject || 'General'}</td>
          </tr>
        `;
      }).join('');

    } catch (error) {
      console.error('Error loading attendance:', error);
      tableBody.innerHTML = '<tr><td colspan="4" class="text-center text-danger">Failed to load data</td></tr>';
    }
  }

  async function loadStats() {
    try {
      const response = await fetch(`${API_URL}/attendance/my-attendance`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();
      if (!data.data) return;

      const stats = { 'Early': 0, 'On-Time': 0, 'Late': 0, 'Absent': 0 };

      data.data.forEach(record => {
        if (stats[record.status] !== undefined) {
          stats[record.status]++;
        }
      });

      document.getElementById('statEarly').textContent = stats['Early'];
      document.getElementById('statOnTime').textContent = stats['On-Time'];
      document.getElementById('statLate').textContent = stats['Late'];
      document.getElementById('statAbsent').textContent = stats['Absent'];
      document.getElementById('statTotal').textContent = data.data.length;

    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }

  // Initial Load
  loadAttendanceHistory();
  loadStats();
  loadAvailableSessions();
});