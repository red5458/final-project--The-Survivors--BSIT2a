document.addEventListener('DOMContentLoaded', function() {
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

  document.getElementById('logoutBtn')?.addEventListener('click', function() {
    localStorage.removeItem('token');
    localStorage.removeItem('currentUser');
    window.location.href = 'login.html';
  });

  // Tab switching
  window.switchTab = function(tabName) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));

    event.target.classList.add('active');
    document.getElementById(tabName + 'Tab').classList.add('active');
  };

  async function loadAttendance() {
    const tableBody = document.getElementById('attendanceTableBody');
    if (!tableBody) return;

    tableBody.innerHTML = '<tr><td colspan="6" class="text-center">Loading...</td></tr>';

    try {
      const response = await fetch('http://localhost:3000/api/attendance', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
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
        const time = new Date(record.timeIn).toLocaleTimeString();
        const statusClass = {
          'Early': 'badge-success',
          'On-Time': 'badge-primary',
          'Late': 'badge-warning',
          'Absent': 'badge-danger'
        }[record.status] || 'badge-secondary';

        const studentName = record.user?.username || record.studentId || 'Unknown';

        return `
          <tr>
            <td>${studentName}</td>
            <td>${record.studentId || 'N/A'}</td>
            <td>${date}</td>
            <td>${time}</td>
            <td><span class="badge ${statusClass}">${record.status}</span></td>
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

  async function loadStats() {
    try {
      const response = await fetch('http://localhost:3000/api/attendance/stats', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (!data.data) return;

      document.getElementById('statEarly').textContent = data.data.today.Early;
      document.getElementById('statOnTime').textContent = data.data.today['On-Time'];
      document.getElementById('statLate').textContent = data.data.today.Late;
      document.getElementById('statAbsent').textContent = data.data.today.Absent;
      document.getElementById('statTotal').textContent = data.data.total;

    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }

  // Load student activity summary from NEW backend endpoint
  async function loadStudentSummary() {
    const grid = document.getElementById('studentSummaryGrid');
    if (!grid) return;

    grid.innerHTML = '<div class="text-center loading" style="grid-column: 1/-1;">Loading student activity data...</div>';

    try {
      const response = await fetch('http://localhost:3000/api/attendance/student-summary', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await response.json();

      if (!response.ok || !result.data || result.data.length === 0) {
        grid.innerHTML = '<div class="text-center" style="grid-column: 1/-1; padding: 2rem;">No student activity data available yet</div>';
        return;
      }

      const students = result.data;
      renderStudentCards(students);

      // Search filter for students
      const studentSearchInput = document.getElementById('studentSearchInput');
      if (studentSearchInput) {
        studentSearchInput.addEventListener('input', function() {
          const term = this.value.toLowerCase();
          const filtered = students.filter(s => 
            s.studentName.toLowerCase().includes(term) || 
            s.studentId.toLowerCase().includes(term)
          );
          renderStudentCards(filtered);
        });
      }

      // Sort filter
      const sortFilter = document.getElementById('sortFilter');
      if (sortFilter) {
        sortFilter.addEventListener('change', function() {
          const sortBy = this.value;
          let sorted = [...students];

          switch(sortBy) {
            case 'name':
              sorted.sort((a, b) => a.studentName.localeCompare(b.studentName));
              break;
            case 'absent':
              sorted.sort((a, b) => b.Absent - a.Absent);
              break;
            case 'late':
              sorted.sort((a, b) => b.Late - a.Late);
              break;
            case 'early':
              sorted.sort((a, b) => b.Early - a.Early);
              break;
          }
          renderStudentCards(sorted);
        });
      }

    } catch (error) {
      console.error('Error loading student summary:', error);
      grid.innerHTML = '<div class="text-center text-danger" style="grid-column: 1/-1; padding: 2rem;">Failed to load student activity data</div>';
    }
  }

  function renderStudentCards(students) {
    const grid = document.getElementById('studentSummaryGrid');
    if (!grid) return;

    if (students.length === 0) {
      grid.innerHTML = '<div class="text-center" style="grid-column: 1/-1; padding: 2rem;">No students found</div>';
      return;
    }

    grid.innerHTML = students.map(student => {
      const total = student.total || 1;
      const earlyPct = student.percentages?.Early?.toFixed(1) || ((student.Early / total) * 100).toFixed(1);
      const ontimePct = student.percentages?.['On-Time']?.toFixed(1) || ((student['On-Time'] / total) * 100).toFixed(1);
      const latePct = student.percentages?.Late?.toFixed(1) || ((student.Late / total) * 100).toFixed(1);
      const absentPct = student.percentages?.Absent?.toFixed(1) || ((student.Absent / total) * 100).toFixed(1);

      // Determine status message
      let statusMsg = '';
      if (student.Absent === 0 && student.Late === 0) {
        statusMsg = ' ⭐ Perfect Attendance!';
      } else if (student.Absent >= 5) {
        statusMsg = ' ⚠️ High Absence Rate';
      } else if (student.Late >= 5) {
        statusMsg = ' 🕐 Frequently Late';
      }

      return `
        <div class="student-card">
          <h4>${student.studentName}</h4>
          <div class="student-id">ID: ${student.studentId}</div>
          <div class="mini-stats">
            <span class="mini-stat early">Early: ${student.Early}</span>
            <span class="mini-stat ontime">On-Time: ${student['On-Time']}</span>
            <span class="mini-stat late">Late: ${student.Late}</span>
            <span class="mini-stat absent">Absent: ${student.Absent}</span>
          </div>
          <div style="margin-top: 0.75rem; font-size: 0.8rem; color: #7f8c8d;">
            📊 Total Records: ${student.total}${statusMsg}
          </div>
          <div style="margin-top: 0.5rem;">
            <div style="display: flex; gap: 0.25rem; margin-bottom: 0.25rem;">
              <div class="progress-bar" style="flex: ${student.Early};"><div class="progress-fill early" style="width: 100%;"></div></div>
              <div class="progress-bar" style="flex: ${student['On-Time']};"><div class="progress-fill ontime" style="width: 100%;"></div></div>
              <div class="progress-bar" style="flex: ${student.Late};"><div class="progress-fill late" style="width: 100%;"></div></div>
              <div class="progress-bar" style="flex: ${student.Absent};"><div class="progress-fill absent" style="width: 100%;"></div></div>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 0.75rem; color: #95a5a6;">
              <span>${earlyPct}% Early</span>
              <span>${ontimePct}% On-Time</span>
              <span>${latePct}% Late</span>
              <span>${absentPct}% Absent</span>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', function() {
      const term = this.value.toLowerCase();
      const rows = document.querySelectorAll('#attendanceTableBody tr');

      rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(term) ? '' : 'none';
      });
    });
  }

  const statusFilter = document.getElementById('statusFilter');
  if (statusFilter) {
    statusFilter.addEventListener('change', function() {
      const status = this.value;
      const rows = document.querySelectorAll('#attendanceTableBody tr');

      rows.forEach(row => {
        if (!status || row.textContent.includes(status)) {
          row.style.display = '';
        } else {
          row.style.display = 'none';
        }
      });
    });
  }

  window.viewDetails = async function(id) {
    try {
      const response = await fetch(`http://localhost:3000/api/attendance/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (!response.ok) {
        alert(data.message || 'Failed to load details');
        return;
      }

      const record = data.data;
      const details = `
        Student: ${record.user?.username || record.studentId}
        ID: ${record.studentId}
        Date: ${new Date(record.timeIn).toLocaleString()}
        Status: ${record.status}
        Subject: ${record.subject || 'General'}
        Notes: ${record.notes || 'None'}
      `;

      alert(details);

    } catch (error) {
      console.error('Error:', error);
      alert('Failed to load details');
    }
  };

  loadAttendance();
  loadStats();
  loadStudentSummary();
});