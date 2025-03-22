// Check if user is logged in
function checkAuth() {
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    if (!userData.isLoggedIn) {
        window.location.href = '/login';
        return false;
    }
    return true;
}

// Add logout functionality
function logout() {
    localStorage.removeItem('userData');
    window.location.href = '/login';
}

// Add user info to navbar
function addUserInfo() {
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    if (userData.name) {
        const navbar = document.querySelector('.navbar-nav');
        if (navbar) {
            // Add user info
            const userInfo = document.createElement('li');
            userInfo.className = 'nav-item';
            userInfo.innerHTML = `
                <span class="nav-link">
                    <i class="fas fa-user me-2"></i>${userData.name}
                </span>
            `;
            navbar.appendChild(userInfo);

            // Add logout button
            const logoutBtn = document.createElement('li');
            logoutBtn.className = 'nav-item';
            logoutBtn.innerHTML = `
                <button class="btn btn-link nav-link" onclick="logout()">
                    <i class="fas fa-sign-out-alt me-2"></i>Logout
                </button>
            `;
            navbar.appendChild(logoutBtn);
        }
    }
}

// Initialize auth when document loads
document.addEventListener('DOMContentLoaded', () => {
    // Only check auth on main page, not login page
    if (!window.location.pathname.includes('login')) {
        if (checkAuth()) {
            addUserInfo();
        }
    }
}); 