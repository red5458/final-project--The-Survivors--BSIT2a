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
  if (userData.role !== 'admin') {
    alert('Access denied. Admin only.');
    window.location.href = 'index.html';
    return;
  }

  document.getElementById('adminName').textContent = userData.username || 'Admin';

  document.getElementById('logoutBtn')?.addEventListener('click', function () {
    localStorage.removeItem('token');
    localStorage.removeItem('currentUser');
    window.location.href = 'login.html';
  });

  // ── 1. ROSTER MANAGEMENT (NEW) ──────────────────────────────────────

  async function loadRoster() {
    const tableBody = document.getElementById('rosterTableBody');
    if (!tableBody) return;

    tableBody.innerHTML = '<tr><td colspan="4" class="text-center">Loading...</td></tr>';

    try {
      const response = await fetch(`${API_URL}/roster`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const result = await response.json();

      if (!response.ok || !result.data || result.data.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No students enrolled in any classes yet.</td></tr>';
        return;
      }

      // Flatten the grouped data if the backend groups it by class, or map directly if it's an array
      let rosterHTML = '';
      const rosterData = result.data;

      rosterData.forEach(entry => {
        const studentName = entry.student ? entry.student.username : 'Unknown User';
        rosterHTML += `
          <tr>
            <td><strong class="text-primary">${entry.className}</strong></td>
            <td>${entry.studentId}</td>
            <td>${studentName}</td>
            <td>
              <button class="btn btn-sm btn-outline-danger" onclick="unenroll('${entry._id}')">
                <i class="fas fa-trash"></i>
              </button>
            </td>
          </tr>
        `;
      });

      tableBody.innerHTML = rosterHTML;

    } catch (error) {
      console.error('Error loading roster:', error);
      tableBody.innerHTML = '<tr><td colspan="4" class="text-center text-danger">Failed to load roster data</td></tr>';
    }
  }

  const enrollForm = document.getElementById('enrollForm');
  if (enrollForm) {
    enrollForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      const studentId = document.getElementById('enrollStudentId').value.trim();
      const className = document.getElementById('enrollClassName').value.trim();
      const submitBtn = enrollForm.querySelector('button[type="submit"]');

      submitBtn.innerHTML = 'Enrolling...';
      submitBtn.disabled = true;

      try {
        const response = await fetch(`${API_URL}/roster/enroll`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ studentId, className })
        });

        const data = await response.json();

        if (response.ok) {
          alert(`✅ Success: Student ${studentId} is now enrolled in ${className}`);
          enrollForm.reset();
          loadRoster();
        } else {
          alert(`❌ Failed: ${data.message}`);
        }
      } catch (error) {
        alert('❌ Cannot connect to server.');
      } finally {
        submitBtn.innerHTML = '<i class="fas fa-plus-circle me-1"></i> Enroll Student';
        submitBtn.disabled = false;
      }
    });
  }

  window.unenroll = async function (id) {
    if (!confirm('Are you sure you want to remove this student from this class?')) return;

    try {
      const response = await fetch(`${API_URL}/roster/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        loadRoster();
      } else {
        const data = await response.json();
        alert(`Failed: ${data.message}`);
      }
    } catch (error) {
      alert('Cannot connect to server.');
    }
  };


  // ── 2. USERS MANAGEMENT ─────────────────────────────────────────────

  async function loadUsers() {
    const tableBody = document.getElementById('usersTableBody');
    if (!tableBody) return;

    try {
      const response = await fetch(`${API_URL}/auth/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();

      if (!response.ok || !data.data || data.data.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" class="text-center">No users found</td></tr>';
        return;
      }

      tableBody.innerHTML = data.data.map(u => {
        let roleClass = 'badge-secondary';
        if (u.role === 'student') roleClass = 'bg-primary';
        if (u.role === 'teacher') roleClass = 'bg-success';
        if (u.role === 'admin') roleClass = 'bg-danger';

        return `
          <tr>
            <td>${u.username}</td>
            <td>${u.email}</td>
            <td>${u.studentId || 'N/A'}</td>
            <td><span class="badge ${roleClass}">${u.role}</span></td>
            <td>
              <button class="btn btn-sm btn-danger" onclick="deleteUser('${u._id}')">Delete</button>
            </td>
          </tr>
        `;
      }).join('');
    } catch (error) {
      tableBody.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Failed to load users</td></tr>';
    }
  }

  window.deleteUser = async function (id) {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      const response = await fetch(`${API_URL}/auth/users/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) { loadUsers(); loadStats(); }
      else alert('Failed to delete user');
    } catch (error) { alert('Error deleting user'); }
  };


  // ── 3. ATTENDANCE MANAGEMENT ────────────────────────────────────────

  async function loadAttendance() {
    const tableBody = document.getElementById('attendanceTableBody');
    if (!tableBody) return;

    try {
      const response = await fetch(`${API_URL}/attendance`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();

      if (!response.ok || !data.data || data.data.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7" class="text-center">No attendance records</td></tr>';
        return;
      }

      tableBody.innerHTML = data.data.map(record => {
        const date = new Date(record.timeIn).toLocaleDateString();
        const time = record.markedByAdmin && record.status === 'Absent' ? '--:--' : new Date(record.timeIn).toLocaleTimeString();

        let statusClass = 'bg-secondary';
        if (record.status === 'Early') statusClass = 'bg-success';
        if (record.status === 'On-Time') statusClass = 'bg-primary';
        if (record.status === 'Late') statusClass = 'bg-warning text-dark';
        if (record.status === 'Absent') statusClass = 'bg-danger';

        return `
          <tr>
            <td>${record.user?.username || 'Unknown'}</td>
            <td>${record.studentId || 'N/A'}</td>
            <td>${date}</td>
            <td>${time}</td>
            <td><span class="badge ${statusClass}">${record.status}</span></td>
            <td>${record.subject || 'General'}</td>
            <td>
              <button class="btn btn-sm btn-warning" onclick="editRecord('${record._id}')">Edit</button>
              <button class="btn btn-sm btn-danger" onclick="deleteRecord('${record._id}')">Delete</button>
            </td>
          </tr>
        `;
      }).join('');
    } catch (error) {
      tableBody.innerHTML = '<tr><td colspan="7" class="text-center text-danger">Failed to load data</td></tr>';
    }
  }

  window.deleteRecord = async function (id) {
    if (!confirm('Are you sure you want to delete this record?')) return;
    try {
      const response = await fetch(`${API_URL}/attendance/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) { loadAttendance(); loadStats(); }
    } catch (error) { alert('Error deleting record'); }
  };

  window.editRecord = async function (id) {
    const newStatus = prompt('Enter new status (Early, On-Time, Late, Absent):');
    if (!newStatus) return;
    try {
      const response = await fetch(`${API_URL}/attendance/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus })
      });
      if (response.ok) { loadAttendance(); loadStats(); }
    } catch (error) { alert('Error updating record'); }
  };


  // ── 4. STATS ────────────────────────────────────────────────────────

  async function loadStats() {
    try {
      const [attendanceRes, usersRes] = await Promise.all([
        fetch(`${API_URL}/attendance/stats`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_URL}/auth/users`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      const attendanceData = await attendanceRes.json();
      const usersData = await usersRes.json();

      if (attendanceData.data) {
        document.getElementById('statEarly').textContent = attendanceData.data.today.Early || 0;
        document.getElementById('statOnTime').textContent = attendanceData.data.today['On-Time'] || 0;
        document.getElementById('statLate').textContent = attendanceData.data.today.Late || 0;
        document.getElementById('statAbsent').textContent = attendanceData.data.today.Absent || 0;
        document.getElementById('statTotalToday').textContent = attendanceData.data.total || 0;
      }

      if (usersData.data) {
        document.getElementById('statTotalUsers').textContent = usersData.data.length;
        document.getElementById('statStudents').textContent = usersData.data.filter(u => u.role === 'student').length;
        document.getElementById('statTeachers').textContent = usersData.data.filter(u => u.role === 'teacher').length;
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }

  // Init
  loadRoster();
  loadUsers();
  loadAttendance();
  loadStats();
});