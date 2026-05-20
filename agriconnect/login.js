// ===== CONFIGURATION =====
const API_BASE_URL = 'http://127.0.0.1:5000'; 
const FARMER_DASHBOARD_URL = 'farmer_home.html'; 

// ===== DOM ELEMENTS =====
const loginForm = document.getElementById('loginForm');
const phoneInput = document.getElementById('phoneNumber');
const loginButton = document.getElementById('loginButton');
const errorMessage = document.getElementById('errorMessage');

// ===== UTILITY FUNCTIONS =====

/**
 * Show loading state on button
 */
function setLoading(isLoading) {
    if (isLoading) {
        loginButton.classList.add('loading');
        loginButton.disabled = true;
    } else {
        loginButton.classList.remove('loading');
        loginButton.disabled = false;
    }
}

/**
 * Display error message
 */
function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.add('show');
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        errorMessage.classList.remove('show');
    }, 5000);
}

/**
 * Hide error message
 */
function hideError() {
    errorMessage.classList.remove('show');
}

/**
 * Validate phone number format (10 digits)
 */
function validatePhoneNumber(phone) {
    const phoneRegex = /^[0-9]{10}$/;
    return phoneRegex.test(phone);
}

/**
 * Store farmer data in localStorage
 */
function storeFarmerData(farmerId, farmerData) {
    try {
        localStorage.setItem('farmer_id', farmerId);
        localStorage.setItem('farmer_data', JSON.stringify(farmerData));
        localStorage.setItem('login_timestamp', new Date().toISOString());
        return true;
    } catch (error) {
        console.error('Error storing farmer data:', error);
        return false;
    }
}

/**
 * Fetch farmer by phone number
 */
async function loginWithPhone(phoneNumber) {
    const url = `${API_BASE_URL}/farmer/phone/${phoneNumber}`;
    
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('Phone number not found. Please check and try again.');
            } else if (response.status === 500) {
                throw new Error('Server error. Please try again later.');
            } else {
                throw new Error(`Login failed. Status: ${response.status}`);
            }
        }

        const data = await response.json();
        
        // Validate response has farmer_id
        if (!data.farmer_id) {
            throw new Error('Invalid response from server. Missing farmer_id.');
        }

        return data;

    } catch (error) {
        // Network error or fetch failed
        if (error.message.includes('fetch')) {
            throw new Error('Network error. Please check your connection.');
        }
        throw error;
    }
}

/**
 * Handle successful login
 */
function handleLoginSuccess(farmerData) {
    // Store farmer data
    const stored = storeFarmerData(farmerData.farmer_id, farmerData);
    
    if (!stored) {
        showError('Error saving login data. Please try again.');
        setLoading(false);
        return;
    }

    // Add success animation
    loginButton.style.background = 'linear-gradient(135deg, #4caf50 0%, #66bb6a 100%)';
    loginButton.innerHTML = '<span class="button-text">✓ Success!</span>';

    // Redirect after brief delay
    setTimeout(() => {
        window.location.href = FARMER_DASHBOARD_URL;
    }, 800);
}

/**
 * Handle login form submission
 */
async function handleLogin(event) {
    event.preventDefault();
    
    // Hide any previous errors
    hideError();

    // Get and validate phone number
    let phoneNumber = phoneInput.value.replace(/\D/g, '');
    phoneNumber = phoneNumber.slice(-10);
    
    if (!validatePhoneNumber(phoneNumber)) {
        showError('Please enter a valid 10-digit phone number');
        phoneInput.focus();
        return;
    }

    // Set loading state
    setLoading(true);

    try {
        // Call API
        const farmerData = await loginWithPhone(phoneNumber);
        
        // Handle success
        handleLoginSuccess(farmerData);

    } catch (error) {
        // Handle error
        console.error('Login error:', error);
        showError(error.message || 'Login failed. Please try again.');
        setLoading(false);
    }
}

// ===== INPUT FORMATTING =====

/**
 * Allow only numeric input
 */
phoneInput.addEventListener('input', (event) => {
    // Remove non-numeric characters
    event.target.value = event.target.value.replace(/[^0-9]/g, '');
    
    // Hide error when user starts typing
    if (errorMessage.classList.contains('show')) {
        hideError();
    }
});

/**
 * Handle paste event to clean pasted content
 */
phoneInput.addEventListener('paste', (event) => {
    event.preventDefault();
    const pastedText = (event.clipboardData || window.clipboardData).getData('text');
    const cleanedText = pastedText.replace(/[^0-9]/g, '').slice(0, 10);
    phoneInput.value = cleanedText;
});

// ===== EVENT LISTENERS =====
loginForm.addEventListener('submit', handleLogin);

// Auto-focus phone input on page load
window.addEventListener('load', () => {
    phoneInput.focus();
});

// ===== CHECK FOR EXISTING SESSION =====
// Redirect if already logged in
window.addEventListener('DOMContentLoaded', () => {
    const existingFarmerId = localStorage.getItem('farmer_id');
    if (existingFarmerId) {
        // Optional: Check if session is still valid (e.g., within 24 hours)
        const loginTimestamp = localStorage.getItem('login_timestamp');
        if (loginTimestamp) {
            const loginTime = new Date(loginTimestamp);
            const now = new Date();
            const hoursSinceLogin = (now - loginTime) / (1000 * 60 * 60);
            
            // If logged in within last 24 hours, redirect
            if (hoursSinceLogin < 24) {
                window.location.href = FARMER_DASHBOARD_URL;
            }
        }
    }
});