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

    if (tabName === 'schedule') {
      loadSchedule();
    }
  };

  // ── Attendance Records ──────────────────────────────────────

  async function loadAttendance() {
    const tableBody = document.getElementById('attendanceTableBody');
    if (!tableBody) return;

    tableBody.innerHTML = '<tr><td colspan="6" class="text-center">Loading...</td></tr>';

    try {
      const response = await fetch('http://localhost:3000/api/attendance', {
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

  // ── Stats ───────────────────────────────────────────────────

  async function loadStats() {
    try {
      const response = await fetch('http://localhost:3000/api/attendance/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
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

  // ── Student Summary ─────────────────────────────────────────

  async function loadStudentSummary() {
    const grid = document.getElementById('studentSummaryGrid');
    if (!grid) return;

    grid.innerHTML = '<div class="text-center loading" style="grid-column: 1/-1;">Loading student activity data...</div>';

    try {
      const response = await fetch('http://localhost:3000/api/attendance/student-summary', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const result = await response.json();

      if (!response.ok || !result.data || result.data.length === 0) {
        grid.innerHTML = '<div class="text-center" style="grid-column: 1/-1; padding: 2rem;">No student activity data available yet</div>';
        return;
      }

      const students = result.data;
      renderStudentCards(students);

      const studentSearchInput = document.getElementById('studentSearchInput');
      if (studentSearchInput) {
        studentSearchInput.addEventListener('input', function () {
          const term = this.value.toLowerCase();
          const filtered = students.filter(s =>
            s.studentName.toLowerCase().includes(term) ||
            s.studentId.toLowerCase().includes(term)
          );
          renderStudentCards(filtered);
        });
      }

      const sortFilter = document.getElementById('sortFilter');
      if (sortFilter) {
        sortFilter.addEventListener('change', function () {
          const sortBy = this.value;
          let sorted = [...students];
          switch (sortBy) {
            case 'name': sorted.sort((a, b) => a.studentName.localeCompare(b.studentName)); break;
            case 'absent': sorted.sort((a, b) => b.Absent - a.Absent); break;
            case 'late': sorted.sort((a, b) => b.Late - a.Late); break;
            case 'early': sorted.sort((a, b) => b.Early - a.Early); break;
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

      let statusMsg = '';
      if (student.Absent === 0 && student.Late === 0) statusMsg = ' ⭐ Perfect Attendance!';
      else if (student.Absent >= 5) statusMsg = ' ⚠️ High Absence Rate';
      else if (student.Late >= 5) statusMsg = ' 🕐 Frequently Late';

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

  // ── Class Schedule ──────────────────────────────────────────

  function formatTime(hhmm) {
    if (!hhmm) return '--:--';
    const [h, m] = hhmm.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour}:${String(m).padStart(2, '0')} ${period}`;
  }

  function addMinutes(hhmm, mins) {
    if (!hhmm) return '--:--';
    const [h, m] = hhmm.split(':').map(Number);
    const total = h * 60 + m + mins;
    const newH = Math.floor(total / 60) % 24;
    const newM = total % 60;
    return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
  }

  function updatePreview() {
    const startTime = document.getElementById('startTime').value;
    const allowance = parseInt(document.getElementById('allowanceTime').value) || 5;
    if (!startTime) return;

    const onTimeEnd = addMinutes(startTime, allowance);
    const absentStart = addMinutes(startTime, 60);

    document.getElementById('previewEarly').textContent = `Before ${formatTime(startTime)}`;
    document.getElementById('previewOnTime').textContent = `${formatTime(startTime)} – ${formatTime(onTimeEnd)}`;
    document.getElementById('previewLate').textContent = `${formatTime(onTimeEnd)} – ${formatTime(absentStart)}`;
    document.getElementById('previewAbsent').textContent = `After ${formatTime(absentStart)}`;
  }

  document.getElementById('startTime')?.addEventListener('input', updatePreview);
  document.getElementById('endTime')?.addEventListener('input', updatePreview);
  document.getElementById('allowanceTime')?.addEventListener('input', updatePreview);

  async function loadSchedule() {
    try {
      const response = await fetch('http://localhost:3000/api/schedule', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();

      if (data.data) {
        const s = data.data;
        document.getElementById('className').value = s.className || '';
        document.getElementById('startTime').value = s.startTime || '';
        document.getElementById('endTime').value = s.endTime || '';
        document.getElementById('allowanceTime').value = s.allowanceMinutes ?? 5;

        const onTimeEnd = addMinutes(s.startTime, s.allowanceMinutes ?? 5);
        const absentStart = addMinutes(s.startTime, 60);

        const banner = document.getElementById('currentScheduleBanner');
        banner.style.display = 'block';
        document.getElementById('scheduleInfo').innerHTML = `
          <div class="stat-card">
            <h3>Class</h3>
            <div class="number" style="font-size: 1.1rem;">${s.className}</div>
          </div>
          <div class="stat-card ontime">
            <h3>Start Time</h3>
            <div class="number" style="font-size: 1.1rem;">${formatTime(s.startTime)}</div>
          </div>
          <div class="stat-card late">
            <h3>End Time</h3>
            <div class="number" style="font-size: 1.1rem;">${formatTime(s.endTime)}</div>
          </div>
          <div class="stat-card absent">
            <h3>On-Time Until</h3>
            <div class="number" style="font-size: 1.1rem;">${formatTime(onTimeEnd)}</div>
          </div>
        `;

        updatePreview();
      }
    } catch (error) {
      console.error('Error loading schedule:', error);
    }
  }

  document.getElementById('scheduleForm')?.addEventListener('submit', async function (e) {
    e.preventDefault();

    const className = document.getElementById('className').value.trim();
    const startTime = document.getElementById('startTime').value;
    const endTime = document.getElementById('endTime').value;
    const allowanceMinutes = parseInt(document.getElementById('allowanceTime').value);

    const submitBtn = this.querySelector('button[type="submit"]');
    submitBtn.textContent = 'Saving...';
    submitBtn.disabled = true;

    try {
      const response = await fetch('http://localhost:3000/api/schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ className, startTime, endTime, allowanceMinutes })
      });

      const data = await response.json();

      if (response.ok) {
        alert('✅ Class schedule saved! Attendance classification will now use these settings.');
        loadSchedule();
      } else {
        alert(data.message || 'Failed to save schedule');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('❌ Cannot connect to server.');
    } finally {
      submitBtn.textContent = '💾 Save Schedule';
      submitBtn.disabled = false;
    }
  });

  // ── Search & Filter ─────────────────────────────────────────

  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', function () {
      const term = this.value.toLowerCase();
      document.querySelectorAll('#attendanceTableBody tr').forEach(row => {
        row.style.display = row.textContent.toLowerCase().includes(term) ? '' : 'none';
      });
    });
  }

  const statusFilter = document.getElementById('statusFilter');
  if (statusFilter) {
    statusFilter.addEventListener('change', function () {
      const status = this.value;
      document.querySelectorAll('#attendanceTableBody tr').forEach(row => {
        row.style.display = (!status || row.textContent.includes(status)) ? '' : 'none';
      });
    });
  }

  // ── View Details ────────────────────────────────────────────

  window.viewDetails = async function (id) {
    try {
      const response = await fetch(`http://localhost:3000/api/attendance/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();
      if (!response.ok) {
        alert(data.message || 'Failed to load details');
        return;
      }

      const record = data.data;
      alert(`
        Student: ${record.user?.username || record.studentId}
        ID: ${record.studentId}
        Date: ${new Date(record.timeIn).toLocaleString()}
        Status: ${record.status}
        Subject: ${record.subject || 'General'}
        Notes: ${record.notes || 'None'}
      `);

    } catch (error) {
      console.error('Error:', error);
      alert('Failed to load details');
    }
  };

  // ── Init ────────────────────────────────────────────────────

  loadAttendance();
  loadStats();
  loadStudentSummary();
});