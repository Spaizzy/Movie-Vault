// account.js
import { State } from './state.js';

// =============================================
// CONFIGURATION
// =============================================
const API_BASE_URL = 'http://localhost:3000'; // Your Backend URL

// =============================================
// INITIALIZE ACCOUNT PAGE
// =============================================
export function initAccount() {
    // Check verification state
    const pendingUser = JSON.parse(localStorage.getItem('pending_verification'));
    
    if (pendingUser) {
        showVerificationScreen(pendingUser);
    } else {
        checkAuthState();
    }

    setupEventListeners();
    updateDashboardStats();
}

// =============================================
// CHECK AUTH STATE
// =============================================
function checkAuthState() {
    const loggedOutView = document.getElementById('logged-out-view');
    const loggedInView = document.getElementById('logged-in-view');
    const verificationView = document.getElementById('verification-view');
    
    const currentUser = JSON.parse(localStorage.getItem('current_user'));
    const token = localStorage.getItem('auth_token');
    
    if (currentUser && token) {
        // Logged In
        loggedOutView.style.display = 'none';
        verificationView.style.display = 'none';
        loggedInView.style.display = 'block';
        populateUserData(currentUser);
    } else {
        // Logged Out
        loggedOutView.style.display = 'block';
        loggedInView.style.display = 'none';
    }
}

// =============================================
// POPULATE USER DATA
// =============================================
function populateUserData(user) {
    document.getElementById('display-username').textContent = user.username || 'User';
    document.getElementById('display-email').textContent = user.email || '';
    document.getElementById('profile-username').value = user.username || '';
    document.getElementById('profile-email').value = user.email || '';
    
    const avatarPreview = document.getElementById('avatar-preview');
    if (user.avatar) {
        avatarPreview.innerHTML = `<img src="${user.avatar}" alt="Profile">`;
    } else {
        avatarPreview.innerHTML = `<span class="material-symbols-rounded">person</span>`;
    }

    // Populate settings
    const settings = JSON.parse(localStorage.getItem('user_settings')) || {};
    document.getElementById('settings-notifications').checked = settings.notifications || true;
    document.getElementById('settings-theme').value = settings.theme || 'dark';
    
    applyTheme(settings.theme || 'dark');

    updateDashboardStats();
}

// =============================================
// UPDATE DASHBOARD STATS
// =============================================
function updateDashboardStats() {
    const currentUser = JSON.parse(localStorage.getItem('current_user'));
    if (!currentUser) return;

    const watchlist = JSON.parse(localStorage.getItem('my_list')) || [];
    const downloads = JSON.parse(localStorage.getItem('my_downloads')) || [];
    const history = JSON.parse(localStorage.getItem('viewing_history')) || [];

    document.getElementById('stat-watchlist').textContent = watchlist.length;
    document.getElementById('stat-downloads').textContent = downloads.length;
    document.getElementById('stat-history').textContent = history.length;
}

// =============================================
// SETUP EVENT LISTENERS
// =============================================
function setupEventListeners() {
    // Login Form
    const loginForm = document.getElementById('login-form');
    if (loginForm) loginForm.addEventListener('submit', handleLogin);

    // Signup Form
    const signupForm = document.getElementById('signup-form');
    if (signupForm) signupForm.addEventListener('submit', handleSignup);

    // Password strength indicator
    const signupPassword = document.getElementById('signup-password');
    if (signupPassword) signupPassword.addEventListener('input', checkPasswordStrength);

    // Avatar upload
    const avatarInput = document.getElementById('avatar-input');
    if (avatarInput) avatarInput.addEventListener('change', handleAvatarUpload);

    // Auto-logout timer (30 minutes inactivity)
    let inactivityTimer;
    document.addEventListener('mousemove', resetInactivityTimer);
    document.addEventListener('keypress', resetInactivityTimer);
    
    function resetInactivityTimer() {
        clearTimeout(inactivityTimer);
        inactivityTimer = setTimeout(() => {
            if (localStorage.getItem('current_user')) {
                logoutUser(true);
            }
        }, 30 * 60 * 1000); // 30 minutes
    }
}

// =============================================
// PASSWORD STRENGTH INDICATOR
// =============================================
function checkPasswordStrength() {
    const password = document.getElementById('signup-password').value;
    const strengthBar = document.getElementById('password-strength-bar');
    const strengthText = document.getElementById('password-strength-text');

    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) strength++;

    const colors = ['#ff4444', '#ffaa00', '#4CAF50', '#00ff88'];
    const labels = ['Weak', 'Fair', 'Good', 'Strong'];

    strengthBar.style.width = `${(strength / 4) * 100}%`;
    strengthBar.style.background = colors[strength - 1] || '#ff4444';
    strengthText.textContent = labels[strength - 1] || 'Too weak';
    strengthText.style.color = colors[strength - 1] || '#ff4444';
}

// =============================================
// HANDLE LOGIN
// =============================================
async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const errorMsg = document.getElementById('login-error');

    errorMsg.style.display = 'none';

    try {
        // Login via real backend
        const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (!response.ok) {
            if (response.status === 403 && !data.verified) {
                // User not verified - show verification screen
                localStorage.setItem('pending_verification', JSON.stringify({ email }));
                showVerificationScreen({ email });
                return;
            }
            throw new Error(data.message || 'Login failed');
        }
        
        // Save to localStorage
        localStorage.setItem('current_user', JSON.stringify(data.user));
        localStorage.setItem('auth_token', data.token);
        window.location.reload();

    } catch (error) {
        errorMsg.textContent = error.message || 'Invalid credentials.';
        errorMsg.style.display = 'block';
    }
}

// =============================================
// HANDLE SIGNUP
// =============================================
async function handleSignup(e) {
    e.preventDefault();
    
    const username = document.getElementById('signup-username').value.trim();
    const email = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value;
    const confirmPassword = document.getElementById('signup-confirm').value;
    const errorMsg = document.getElementById('signup-error');

    errorMsg.style.display = 'none';

    if (password !== confirmPassword) {
        errorMsg.textContent = 'Passwords do not match.';
        errorMsg.style.display = 'block';
        return;
    }

    try {
        // Signup via real backend
        const response = await fetch(`${API_BASE_URL}/api/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Signup failed');
        }
        
        // Backend sends email - no code in local storage or alerts!
        localStorage.setItem('pending_verification', JSON.stringify({
            email, 
            username,
            verified: false
        }));

        showVerificationScreen({ email, username });
        
    } catch (error) {
        errorMsg.textContent = error.message || 'Signup failed. Please try again.';
        errorMsg.style.display = 'block';
    }
}

// =============================================
// SHOW VERIFICATION SCREEN
// =============================================
function showVerificationScreen(user) {
    const loggedOutView = document.getElementById('logged-out-view');
    const loggedInView = document.getElementById('logged-in-view');
    const verificationView = document.getElementById('verification-view');
    
    document.getElementById('verification-email').textContent = user.email || '';
    document.getElementById('verification-email').textContent = user.email || '';
    
    loggedOutView.style.display = 'none';
    loggedInView.style.display = 'none';
    verificationView.style.display = 'block';

    // Focus first input
    const firstInput = document.querySelector('.code-input');
    if (firstInput) firstInput.focus();
}

// =============================================
// MOVE TO NEXT INPUT (OTP)
// =============================================
window.moveToNext = function(input) {
    if (input.value.length === 1) {
        const next = input.nextElementSibling;
        if (next) next.focus();
    }
};

// =============================================
// HANDLE BACKSPACE (OTP)
// =============================================
window.handleBackspace = function(event, input) {
    if (event.key === 'Backspace' && input.value.length === 0) {
        const prev = input.previousElementSibling;
        if (prev) prev.focus();
    }
};

// =============================================
// VERIFY CODE
// =============================================
window.verifyCode = async function() {
    const codeInputs = document.querySelectorAll('.code-input');
    const enteredCode = Array.from(codeInputs).map(input => input.value).join('');
    const errorMsg = document.getElementById('verification-error');
    const pendingUser = JSON.parse(localStorage.getItem('pending_verification'));

    errorMsg.style.display = 'none';

    try {
        // Verify via real backend
        const response = await fetch(`${API_BASE_URL}/api/auth/verify-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: pendingUser.email, code: enteredCode })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Verification failed');
        }

        // Backend verifies successfully - auto-login
        const loginResponse = await fetch(`${API_BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: pendingUser.email, password: pendingUser.password })
        });

        const loginData = await loginResponse.json();

        if (!loginResponse.ok) {
            throw new Error(loginData.message || 'Auto-login failed');
        }

        // Save to localStorage
        localStorage.setItem('current_user', JSON.stringify(loginData.user));
        localStorage.setItem('auth_token', loginData.token);
        localStorage.removeItem('pending_verification');

        // Clear OTP inputs
        codeInputs.forEach(input => input.value = '');

        // Show success message
        errorMsg.textContent = 'Email verified successfully!';
        errorMsg.style.display = 'block';
        errorMsg.style.color = '#4CAF50';

        setTimeout(() => {
            window.location.reload();
        }, 2000);

    } catch (error) {
        errorMsg.textContent = error.message || 'Invalid code. Please try again.';
        errorMsg.style.display = 'block';
        errorMsg.style.color = '#ff4444';
    }
};

// =============================================
// RESEND CODE
// =============================================
window.resendCode = function() {
    const pendingUser = JSON.parse(localStorage.getItem('pending_verification'));
    if (!pendingUser) return;

    // Call backend to resend code (optional - not in provided backend yet)
    // For now, just show a toast
    const successMsg = document.getElementById('resend-success');
    successMsg.style.display = 'block';
    
    setTimeout(() => {
        successMsg.style.display = 'none';
    }, 3000);
    
    // TODO: Implement backend endpoint to resend code
    console.log('Request resend code for:', pendingUser.email);
};

// =============================================
// SWITCH ACCOUNT TABS (Login / Signup)
// =============================================
window.switchAccountTab = function(tabName) {
    const tabs = document.querySelectorAll('.account-tab');
    const panels = document.querySelectorAll('.account-panel');

    tabs.forEach(tab => tab.classList.remove('active'));
    panels.forEach(panel => panel.classList.remove('active'));

    if (tabName === 'login') {
        tabs[0].classList.add('active');
        document.getElementById('login-panel').classList.add('active');
    } else if (tabName === 'signup') {
        tabs[1].classList.add('active');
        document.getElementById('signup-panel').classList.add('active');
    }
};

// =============================================
// SWITCH ACCOUNT PANELS
// =============================================
window.switchAccountPanel = function(panelName) {
    const tabs = document.querySelectorAll('.account-tab');
    const panels = document.querySelectorAll('.account-panel');

    tabs.forEach(tab => tab.classList.remove('active'));
    panels.forEach(panel => panel.classList.remove('active'));

    const panelMap = {
        'profile': 0,
        'plan': 1,
        'settings': 2,
        'security': 3
    };

    if (panelMap[panelName] !== undefined) {
        tabs[panelMap[panelName]].classList.add('active');
        document.getElementById(`${panelName}-panel`).classList.add('active');
    }
};

// =============================================
// UPDATE PROFILE
// =============================================
window.updateProfile = async function() {
    const username = document.getElementById('profile-username').value.trim();
    const successMsg = document.getElementById('profile-success');

    successMsg.style.display = 'none';

    const currentUser = JSON.parse(localStorage.getItem('current_user'));
    if (!currentUser) return;

    const updatedUser = { ...currentUser, username };

    try {
        // API call
        const response = await fetch(`${API_BASE_URL}/api/auth/update`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
            },
            body: JSON.stringify({ username })
        });

        if (!response.ok) throw new Error('Update failed');
        
        const data = await response.json();
        
        // Use the updated user from the backend
        localStorage.setItem('current_user', JSON.stringify(data.user));

    } catch (error) {
        // Fallback to local state
        localStorage.setItem('current_user', JSON.stringify(updatedUser));
    }

    successMsg.style.display = 'block';
    setTimeout(() => {
        successMsg.style.display = 'none';
        populateUserData(updatedUser);
    }, 2000);
};

// =============================================
// CHANGE PLAN
// =============================================
window.changePlan = async function() {
    const currentUser = JSON.parse(localStorage.getItem('current_user'));
    if (!currentUser) return;

    const confirmChange = confirm('Do you want to change your subscription plan?');
    if (!confirmChange) return;

    currentUser.plan = 'premium';
    localStorage.setItem('current_user', JSON.stringify(currentUser));

    alert('Plan updated to Premium successfully!');
};

// =============================================
// SAVE SETTINGS
// =============================================
window.saveSettings = function() {
    const notifications = document.getElementById('settings-notifications').checked;
    const theme = document.getElementById('settings-theme').value;
    const successMsg = document.getElementById('settings-success');

    const settings = { notifications, theme };
    localStorage.setItem('user_settings', JSON.stringify(settings));

    applyTheme(theme);

    successMsg.style.display = 'block';
    setTimeout(() => {
        successMsg.style.display = 'none';
    }, 3000);
};

// =============================================
// APPLY THEME
// =============================================
function applyTheme(theme) {
    if (theme === 'light') {
        document.documentElement.style.setProperty('--bg-primary', '#ffffff');
        document.documentElement.style.setProperty('--bg-secondary', '#f5f5f5');
        document.documentElement.style.setProperty('--text-primary', '#000000');
        document.documentElement.style.setProperty('--text-secondary', '#666666');
    } else {
        document.documentElement.style.setProperty('--bg-primary', '#12121a');
        document.documentElement.style.setProperty('--bg-secondary', '#1a1a24');
        document.documentElement.style.setProperty('--text-primary', '#ffffff');
        document.documentElement.style.setProperty('--text-secondary', '#888888');
    }
}

// =============================================
// HANDLE AVATAR UPLOAD
// =============================================
function handleAvatarUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async function(e) {
        const avatarData = e.target.result;
        
        const currentUser = JSON.parse(localStorage.getItem('current_user'));
        if (!currentUser) return;
        
        currentUser.avatar = avatarData;
        
        try {
            // Send to backend
            const response = await fetch(`${API_BASE_URL}/api/auth/update`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                },
                body: JSON.stringify({ avatar: avatarData })
            });
            
            if (response.ok) {
                const data = await response.json();
                localStorage.setItem('current_user', JSON.stringify(data.user));
            }
        } catch (error) {
            // Fallback to local storage
            localStorage.setItem('current_user', JSON.stringify(currentUser));
        }

        populateUserData(currentUser);
    };
    reader.readAsDataURL(file);
}

// =============================================
// CHANGE PASSWORD
// =============================================
window.changePassword = async function() {
    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password').value;
    const successMsg = document.getElementById('password-success');
    const errorMsg = document.getElementById('password-error');
    const currentUser = JSON.parse(localStorage.getItem('current_user'));

    successMsg.style.display = 'none';
    errorMsg.style.display = 'none';

    if (!currentUser) return;

    try {
        // API call
        const response = await fetch(`${API_BASE_URL}/api/auth/change-password`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
            },
            body: JSON.stringify({ currentPassword, newPassword })
        });

        const data = await response.json();

        if (!response.ok) {
            errorMsg.textContent = data.message || 'Failed to change password';
            errorMsg.style.display = 'block';
            return;
        }

    } catch (error) {
        errorMsg.textContent = 'Failed to change password. Please try again.';
        errorMsg.style.display = 'block';
        return;
    }

    successMsg.style.display = 'block';
    setTimeout(() => {
        successMsg.style.display = 'none';
        document.getElementById('current-password').value = '';
        document.getElementById('new-password').value = '';
    }, 3000);
};

// =============================================
// LOGOUT
// =============================================
window.logoutUser = function(autoLogout = false) {
    localStorage.removeItem('current_user');
    localStorage.removeItem('auth_token');
    
    if (autoLogout) {
        alert('You have been logged out due to inactivity.');
    }
    
    window.location.href = '/html/account.html';
};

// =============================================
// DELETE ACCOUNT
// =============================================
window.deleteAccount = async function() {
    if (!confirm('Are you sure you want to delete your account? This cannot be undone.')) return;

    const currentUser = JSON.parse(localStorage.getItem('current_user'));
    if (!currentUser) return;

    try {
        // API call
        const response = await fetch(`${API_BASE_URL}/api/auth/delete`, {
            method: 'DELETE',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
            }
        });

        if (!response.ok) throw new Error('Delete failed');

    } catch (error) {
        console.error('Delete error:', error);
    }

    localStorage.removeItem('current_user');
    localStorage.removeItem('auth_token');
    
    window.location.href = '/html/account.html';
};

// =============================================
// INITIALIZE ON LOAD
// =============================================
document.addEventListener('DOMContentLoaded', () => {
    initAccount();
});