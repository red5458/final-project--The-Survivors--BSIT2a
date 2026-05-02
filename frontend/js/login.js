document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('loginForm');
    
    if (!form) {
        console.error('Login form not found!');
        return;
    }
    
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Get values - using email field for ID (can be email or student ID)
        const email = document.getElementById('loginId').value.trim();
        const password = document.getElementById('loginPassword').value;
        
        if (!email || !password) {
            alert('Please enter both ID/Email and Password!');
            return;
        }
        
        try {
            console.log('Attempting login...', { email });
            
            const response = await fetch('http://localhost:3000/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });
            
            const data = await response.json();
            console.log('Login response:', data);
            
            if (!response.ok) {
                alert(`Error: ${data.message || 'Login failed'}`);
                return;
            }
            
            // Save token and user data
            localStorage.setItem('token', data.token);
            localStorage.setItem('currentUser', JSON.stringify(data.user));
            
            alert('✅ Login successful!');
            
            // Redirect based on role
            if (data.user.role === 'student') {
                window.location.href = 'student-dashboard.html';
            } else if (data.user.role === 'teacher') {
                window.location.href = 'teacher-dashboard.html';
            } else {
                window.location.href = 'index.html';
            }
            
        } catch (error) {
            console.error('Login error:', error);
            alert('❌ Cannot connect to server. Make sure backend is running.');
        }
    });
});