// ===== CONFIGURATION =====
const VIEWS = {
    health: 'farmer_health.html',
    pest: 'farmer_pest.html',
    nutrient: 'farmer_nutrients.html',
    yield: 'farmer_yield.html',
    zones: 'farmer_zones.html',
    recommendations: 'farmer_recommendations.html',
    uav: 'farmer_uav.html'
};

const LOGIN_PAGE_URL = 'http://127.0.0.1:5500/agriconnect/login.html';
const API_BASE_URL = 'http://127.0.0.1:5000'; // Flask backend URL

// ===== DOM ELEMENTS =====
const farmerGreeting = document.getElementById('farmerGreeting');
const logoutButton = document.getElementById('logoutButton');
const dashboardCards = document.querySelectorAll('.dashboard-card');
const activeFieldsElement = document.getElementById('activeFields');
const lastUpdatedElement = document.getElementById('lastUpdated');

// UAV Anomaly Elements
const anomalyCard = document.getElementById('anomalyCard');
const anomalyStatus = document.getElementById('anomalyStatus');
const anomalyLevel = document.getElementById('anomalyLevel');
const anomalyTypes = document.getElementById('anomalyTypes');
const anomalyConfidence = document.getElementById('anomalyConfidence');
const anomalyImpact = document.getElementById('anomalyImpact');
const anomalyActions = document.getElementById('anomalyActions');
const officerAlertBadge = document.getElementById('officerAlertBadge');
const confidenceBar = document.getElementById('confidenceBar');


// ===== STATE =====
let farmerId = null;
let farmerData = null;

// ===== INITIALIZATION =====

/**
 * Initialize the page
 */

// ===== UAV STATUS CHECK =====
/**
 * Check if there's an active UAV flight
 */
function checkUAVStatus() {
    try {
        const uavFlightData = localStorage.getItem('uav_flight_data');
        if (uavFlightData) {
            const flightData = JSON.parse(uavFlightData);
            const now = Date.now();
            
            // Check if flight is currently active
            if (flightData.status === 'flying' && flightData.landTime > now) {
                // Show active flight indicator
                showActiveFlightIndicator(flightData);
            } else if (flightData.status === 'flying' && flightData.landTime <= now) {
                // Flight completed, update status
                flightData.status = 'completed';
                localStorage.setItem('uav_flight_data', JSON.stringify(flightData));
            }
        }
    } catch (error) {
        console.error('Error checking UAV status:', error);
    }
}

/**
 * Show active flight indicator
 */
function showActiveFlightIndicator(flightData) {
    const uavCard = document.querySelector('[data-view="uav"]');
    if (!uavCard) return;

    // Add active flight badge
    const existingBadge = uavCard.querySelector('.flight-active-badge');
    if (existingBadge) return; // Already shown

    const badge = document.createElement('div');
    badge.className = 'flight-active-badge';
    badge.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
        </svg>
        <span>ACTIVE</span>
    `;
    uavCard.appendChild(badge);
}

function init() {
    // Check authenticationwhat to do 

    if (!checkAuthentication()) {
        return;
    }

    // Load farmer data
    loadFarmerData();

    // Setup event listeners
    setupEventListeners();

    // Update UI
    updateGreeting();
    updateQuickStats();
    
    // ADD THIS LINE:
    checkUAVStatus();  // Check for active UAV flights
}

/**
 * Check if user is authenticated
 */
function checkAuthentication() {
    farmerId = localStorage.getItem('farmer_id');

    if (!farmerId) {
        // Not logged in, redirect to login
        console.warn('No farmer_id found. Redirecting to login.');
        window.location.href = LOGIN_PAGE_URL;
        return false;
    }

    return true;
}

/**
 * Load farmer data from localStorage
 */
function loadFarmerData() {
    try {
        const farmerDataString = localStorage.getItem('farmer_data');
        if (farmerDataString) {
            farmerData = JSON.parse(farmerDataString);
            console.log('Farmer data loaded:', farmerData);
        }
    } catch (error) {
        console.error('Error parsing farmer data:', error);
        farmerData = null;
    }
}

/**
 * Fetch real-time data from Flask backend
 */
async function fetchBackendData() {
    try {
        const url = `${API_BASE_URL}/farmer/${farmerId}`;
        console.log('Fetching data from:', url);
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Backend data received:', data);

        // TEMP: simulate anomaly if backend not running
if (!data.anomaly_analysis) {
  data.anomaly_analysis = generateSimulatedAnomaly(farmerId);
}

function generateSimulatedAnomaly(farmerId) {
  switch (farmerId) {

    case 'Farmer_1':
      return {
       anomaly_detected: true,
        anomaly_level: "High",
        anomaly_type: [
          "Non-Crop Content Detected",
          "Camera Sensor Malfunction (Color Shift)"
        ],
        confidence: 77,
        impact: "UAV data unreliable. High risk of incorrect crop assessment.",
        recommended_action: [
          "Abort current UAV mission",
          "Recalibrate camera sensor",
          "Notify field officer for manual inspection"
        ],
        officer_alert_required: true
      };

    case 'Farmer_2':
      return {
        anomaly_detected: true,
        anomaly_level: "Medium",
        anomaly_type: [
          "Motion Blur (Moderate)",
          "Underexposed Image"
        ],
        confidence: 46,
        impact: "Some UAV images may have reduced clarity. Crop analysis accuracy slightly affected.",
        recommended_action: [
          "Reduce UAV flight speed",
          "Adjust camera exposure before next flight"
        ],
        officer_alert_required: false
      };

    case 'Farmer_3':
      return {
        anomaly_detected: false,
        anomaly_level: "Low",
        anomaly_type: ["None"],
        confidence: 12,
        impact: "UAV systems operating normally. Image quality within acceptable limits.",
        recommended_action: [
          "Continue routine UAV monitoring"
        ],
        officer_alert_required: false
      };

    default:
      return {
        anomaly_detected: false,
        anomaly_level: "Low",
        anomaly_type: ["None"],
        confidence: 5,
        impact: "No anomalies detected.",
        recommended_action: [
          "No action required"
        ],
        officer_alert_required: false
      };
  }
}

        
        // Update anomaly card
        updateAnomalyCard(data);
        
    } catch (error) {
        console.error('Error fetching backend data:', error);
        // Show error state in anomaly card
        showAnomalyError();
    }
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    // Logout button
    logoutButton.addEventListener('click', handleLogout);

    // Dashboard cards
    dashboardCards.forEach(card => {
        card.addEventListener('click', handleCardClick);

        // Add keyboard accessibility
        card.setAttribute('tabindex', '0');
        card.setAttribute('role', 'button');
        
        card.addEventListener('keypress', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                handleCardClick.call(card, event);
            }
        });

        // Add ripple effect on click
        card.addEventListener('mousedown', createRipple);
    });
}

// ===== UI UPDATES =====

/**
 * Update greeting message
 */
function updateGreeting() {
    let greeting = 'Welcome back';

    // Try to get farmer name from data
    if (farmerData) {
        if (farmerData.name) {
            greeting = `Welcome back, ${farmerData.name}`;
        } else if (farmerData.farmer_name) {
            greeting = `Welcome back, ${farmerData.farmer_name}`;
        }
    }

    // Add time-based greeting
    const hour = new Date().getHours();
    let timeGreeting = 'Welcome back';
    
    if (hour < 12) {
        timeGreeting = 'Good morning';
    } else if (hour < 17) {
        timeGreeting = 'Good afternoon';
    } else {
        timeGreeting = 'Good evening';
    }

    if (farmerData && (farmerData.name || farmerData.farmer_name)) {
        const name = farmerData.name || farmerData.farmer_name;
        farmerGreeting.textContent = `${timeGreeting}, ${name}`;
    } else {
        farmerGreeting.textContent = `${timeGreeting}, Farmer`;
    }
}

/**
 * Update quick stats section
 */
function updateQuickStats() {
    // Update last updated time
    const loginTimestamp = localStorage.getItem('login_timestamp');
    if (loginTimestamp && lastUpdatedElement) {
        const loginDate = new Date(loginTimestamp);
        const today = new Date();
        
        if (isSameDay(loginDate, today)) {
            lastUpdatedElement.textContent = 'Today';
        } else {
            lastUpdatedElement.textContent = formatDate(loginDate);
        }
    }

    // Active fields will be updated when we fetch farmer details in future
    if (activeFieldsElement) {
        activeFieldsElement.textContent = '—';
    }
}

/**
 * Update UAV Anomaly Card
 */
function updateAnomalyCard(data) {
    const anomaly = data.anomaly_analysis;
    
    if (!anomaly) {
        // Hide anomaly card if no data
        anomalyCard.style.display = 'none';
        return;
    }
    
    // Show the card
    anomalyCard.style.display = 'block';
    
    // Update status text
    anomalyStatus.textContent = anomaly.anomaly_detected ? 'Anomaly Detected' : 'System Normal';
    
    // Update level with color coding
    anomalyLevel.textContent = anomaly.anomaly_level;
    anomalyLevel.className = 'anomaly-level';
    
    // Remove all alert classes first
    anomalyCard.classList.remove('card-alert-high', 'card-alert-medium', 'card-alert-low');
    
    if (anomaly.anomaly_level === 'High') {
        anomalyLevel.classList.add('level-high');
        anomalyCard.classList.add('card-alert-high');
    } else if (anomaly.anomaly_level === 'Medium') {
        anomalyLevel.classList.add('level-medium');
        anomalyCard.classList.add('card-alert-medium');
    } else {
        anomalyLevel.classList.add('level-low');
        anomalyCard.classList.add('card-alert-low');
    }
    
    // Update anomaly types
    if (anomaly.anomaly_type && anomaly.anomaly_type.length > 0 && anomaly.anomaly_type[0] !== 'None') {
        anomalyTypes.innerHTML = anomaly.anomaly_type.map(type => 
            `<span class="anomaly-tag">${escapeHtml(type)}</span>`
        ).join('');
    } else {
        anomalyTypes.innerHTML = '<span class="anomaly-tag anomaly-tag-success">None</span>';
    }
    
    // Update confidence
    const confidenceValue = anomaly.confidence || 0;
    anomalyConfidence.textContent = `${confidenceValue}%`;
    
    if (confidenceValue > 50) {
        anomalyConfidence.style.color = '#d32f2f';
    } else if (confidenceValue > 25) {
        anomalyConfidence.style.color = '#f57c00';
    } else {
        anomalyConfidence.style.color = '#388e3c';
    }
    
    // Animate confidence bar
    if (confidenceBar) {
        setTimeout(() => {
            confidenceBar.style.width = `${confidenceValue}%`;
            confidenceBar.className = 'confidence-bar';
            
            if (confidenceValue > 50) {
                confidenceBar.classList.add('bar-high');
            } else if (confidenceValue > 25) {
                confidenceBar.classList.add('bar-medium');
            } else {
                confidenceBar.classList.add('bar-low');
            }
        }, 100);
    }
    
    // Update impact message
    anomalyImpact.textContent = anomaly.impact || 'Analysis proceeding normally';
    
    // Update recommended actions
    if (anomaly.recommended_action && anomaly.recommended_action.length > 0) {
        anomalyActions.innerHTML = anomaly.recommended_action.map(action => 
            `<li class="action-item">${escapeHtml(action)}</li>`
        ).join('');
    } else {
        anomalyActions.innerHTML = '<li class="action-item">No action required</li>';
    }
    
    // Officer alert badge
    if (anomaly.officer_alert_required) {
        officerAlertBadge.style.display = 'inline-flex';
        officerAlertBadge.textContent = 'Officer Notified';
    } else {
        officerAlertBadge.style.display = 'none';
    }
}

/**
 * Show error state in anomaly card
 */
function showAnomalyError() {
    if (!anomalyCard) return;
    
    anomalyCard.style.display = 'block';
    anomalyCard.classList.add('card-alert-medium');
    
    anomalyStatus.textContent = 'Connection Error';
    anomalyLevel.textContent = 'N/A';
    anomalyLevel.className = 'anomaly-level level-medium';
    
    anomalyTypes.innerHTML = '<span class="anomaly-tag">Unable to fetch data</span>';
    anomalyConfidence.textContent = '—';
    anomalyImpact.textContent = 'Cannot connect to backend server. Please check your connection.';
    anomalyActions.innerHTML = '<li class="action-item">Refresh page to retry</li>';
    
    officerAlertBadge.style.display = 'none';
}

// ===== EVENT HANDLERS =====

/**
 * Handle dashboard card click
 */
function handleCardClick(event) {
    const card = event.currentTarget;
    const view = card.getAttribute('data-view');

    if (!view || !VIEWS[view]) {
        console.error('Invalid view:', view);
        return;
    }

    // Add click animation
    card.style.transform = 'scale(0.98)';
    setTimeout(() => {
        card.style.transform = '';
    }, 150);

    // Store selected view for potential future use
    sessionStorage.setItem('selected_view', view);

    // Navigate to view page
    setTimeout(() => {
        window.location.href = VIEWS[view];
    }, 200);
}

/**
 * Handle logout
 */
function handleLogout() {
    // Confirm logout
    const confirmed = confirm('Are you sure you want to logout?');
    
    if (!confirmed) {
        return;
    }

    // Clear all stored data
    localStorage.removeItem('farmer_id');
    localStorage.removeItem('farmer_data');
    localStorage.removeItem('login_timestamp');
    sessionStorage.clear();

    // Add logout animation
    logoutButton.textContent = 'Logging out...';
    logoutButton.disabled = true;

    // Redirect to login
    setTimeout(() => {
        window.location.href = LOGIN_PAGE_URL;
    }, 500);
}

/**
 * Create ripple effect on card click
 */
function createRipple(event) {
    const card = event.currentTarget;
    const ripple = document.createElement('span');
    const rect = card.getBoundingClientRect();

    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;

    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    ripple.classList.add('ripple-effect');

    // Add ripple styles
    ripple.style.position = 'absolute';
    ripple.style.borderRadius = '50%';
    ripple.style.background = 'rgba(124, 179, 66, 0.3)';
    ripple.style.transform = 'scale(0)';
    ripple.style.animation = 'ripple-animation 0.6s ease-out';
    ripple.style.pointerEvents = 'none';

    card.appendChild(ripple);

    setTimeout(() => {
        ripple.remove();
    }, 600);
}

// Add ripple animation to document
const style = document.createElement('style');
style.textContent = `
    @keyframes ripple-animation {
        to {
            transform: scale(4);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// ===== UTILITY FUNCTIONS =====

/**
 * Check if two dates are the same day
 */
function isSameDay(date1, date2) {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
}

/**
 * Format date for display
 */
function formatDate(date) {
    const options = { month: 'short', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Session timeout warning (optional)
 */
function checkSessionTimeout() {
    const loginTimestamp = localStorage.getItem('login_timestamp');
    
    if (!loginTimestamp) {
        return;
    }

    const loginTime = new Date(loginTimestamp);
    const now = new Date();
    const hoursSinceLogin = (now - loginTime) / (1000 * 60 * 60);

    // Warn if session is older than 23 hours
    if (hoursSinceLogin > 23 && hoursSinceLogin < 24) {
        console.warn('Session will expire soon. Please login again.');
        // Could show a toast notification here
    }

    // Auto-logout after 24 hours
    if (hoursSinceLogin >= 24) {
        alert('Your session has expired. Please login again.');
        handleLogout();
    }
}

// ===== PAGE LOAD =====
window.addEventListener('DOMContentLoaded', () => {
    init();
    
    // Check session timeout every 5 minutes
    setInterval(checkSessionTimeout, 5 * 60 * 1000);
    
    // Refresh anomaly data every 2 minutes
    setInterval(() => {
        if (checkAuthentication()) {
            fetchBackendData();
        }
    }, 2 * 60 * 1000);
});

// ===== PAGE VISIBILITY =====
// Refresh data when user returns to tab
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        checkAuthentication();
        updateQuickStats();
        fetchBackendData();
    }
});