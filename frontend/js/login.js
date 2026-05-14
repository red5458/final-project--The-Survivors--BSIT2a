// frontend/js/login.js

// DYNAMIC API URL SETUP:
// If your frontend and backend are hosted separately on Render, replace the production URL
// with your actual Render backend link (e.g., 'https://the-survivors-backend.onrender.com/api')
const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? '/api'
  : '/api'; // <-- CHANGE THIS TO YOUR RENDER BACKEND URL IF HOSTED SEPARATELY

document.addEventListener('DOMContentLoaded', function () {
  const token = localStorage.getItem('token');
  const user = localStorage.getItem('currentUser');

  if (token && user) {
    try {
      const userData = JSON.parse(user);
      if (userData.role === 'student') {
        window.location.href = 'student-dashboard.html';
      } else if (userData.role === 'teacher') {
        window.location.href = 'teacher-dashboard.html';
      } else if (userData.role === 'admin') {
        window.location.href = 'admin-dashboard.html';
      }
      return;
    } catch (err) {
      console.error('Error parsing user data, clearing storage');
      localStorage.removeItem('token');
      localStorage.removeItem('currentUser');
    }
  }

  const form = document.getElementById('loginForm');

  if (!form) {
    console.error('Login form not found!');
    return;
  }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();

    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    if (!email || !password) {
      alert('Please enter both Email and Password!');
      return;
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Logging in...';
    submitBtn.disabled = true;

    try {
      console.log('Attempting login...', { email, targetUrl: `${API_URL}/auth/login` });

      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      // Safely attempt to parse JSON in case the server returns an HTML error page
      let data;
      try {
        data = await response.json();
        console.log('Login response:', data);
      } catch (parseError) {
        console.error('Failed to parse response as JSON. Check if your backend URL is correct.', parseError);
        alert('Server error: Did not receive valid JSON. Check the console for details.');
        return;
      }

      if (!response.ok) {
        if (data.errors && Array.isArray(data.errors)) {
          const errorMessages = data.errors.map(err => `${err.field}: ${err.message}`).join('\n');
          alert(`Validation Errors:\n${errorMessages}`);
        } else {
          // Exposing the exact error message (e.g., "Wrong password" or "User not found")
          alert(`Error (${response.status}): ${data.message || 'Login failed'}`);
        }
        return;
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('currentUser', JSON.stringify(data.user));

      alert('✅ Login successful!');

      if (data.user.role === 'student') {
        window.location.href = 'student-dashboard.html';
      } else if (data.user.role === 'teacher') {
        window.location.href = 'teacher-dashboard.html';
      } else if (data.user.role === 'admin') {
        window.location.href = 'admin-dashboard.html';
      } else {
        window.location.href = 'index.html';
      }

    } catch (error) {
      console.error('Login error:', error);
      alert('❌ Cannot connect to server. Check your internet connection or ensure the backend URL is properly configured.');
    } finally {
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
    }
  });
});