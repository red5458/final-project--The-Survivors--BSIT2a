document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('registerForm');
    
    if (!form) {
        console.error('Register form not found!');
        return;
    }
    
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Get form values
        const username = document.getElementById('regName').value.trim();
        const email = document.getElementById('regEmail').value.trim();
        const password = document.getElementById('regPassword').value;
        const confirmPassword = document.getElementById('regConfirmPassword').value;
        const role = document.getElementById('regRole').value;
        const studentId = document.getElementById('regStudentId').value.trim();
        
        // Validation
        if (!username || !email || !password || !studentId) {
            alert('Please fill in all required fields!');
            return;
        }
        
        if (password !== confirmPassword) {
            alert('Passwords do not match!');
            return;
        }
        
        if (password.length < 6) {
            alert('Password must be at least 6 characters long!');
            return;
        }
        
        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            alert('Please enter a valid email address!');
            return;
        }
        
        try {
            console.log('Submitting registration...', { username, email, role, studentId });
            
            const response = await fetch('http://localhost:3000/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username,
                    email,
                    password,
                    role,
                    studentId: role === 'student' ? studentId : undefined
                })
            });
            
            const data = await response.json();
            console.log('Server response:', data);
            
            if (!response.ok) {
                alert(`Error: ${data.message || 'Registration failed'}`);
                return;
            }
            
            // Success!
            alert('✅ Registration successful! Please login.');
            
            // Redirect to login page
            window.location.href = 'login.html';
            
        } catch (error) {
            console.error('Registration error:', error);
            alert('❌ Cannot connect to server. Make sure backend is running on port 3000.');
        }
    });
});