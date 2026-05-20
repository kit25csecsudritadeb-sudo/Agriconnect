// ===== CONFIGURATION =====
const API_BASE_URL = 'http://127.0.0.1:5000'; // Set your base URL here
const BACK_URL = 'farmer_home.html';
const LOGIN_URL = 'farmer_health.html';

// ===== DOM ELEMENTS =====
const loadingOverlay = document.getElementById('loadingOverlay');
const errorContainer = document.getElementById('errorContainer');
const errorMessage = document.getElementById('errorMessage');
const mainContent = document.getElementById('mainContent');
const backButton = document.getElementById('backButton');
const refreshButton = document.getElementById('refreshButton');
const retryButton = document.getElementById('retryButton');

// Status elements
const statusIconContainer = document.getElementById('statusIconContainer');
const statusPercentage = document.getElementById('statusPercentage');
const statusValue = document.getElementById('statusValue');
const statusBadge = document.getElementById('statusBadge');
const lastUpdated = document.getElementById('lastUpdated');

// Content elements
const insightText = document.getElementById('insightText');
const recommendationsList = document.getElementById('recommendationsList');
const recommendationCount = document.getElementById('recommendationCount');
const indicatorsGrid = document.getElementById('indicatorsGrid');
const tooltip = document.getElementById('tooltip');
const tooltipContent = document.getElementById('tooltipContent');

// ===== STATE =====
let farmerId = null;
let farmerData = null;

// ===== INITIALIZATION =====

/**
 * Initialize the page
 */
async function init() {
    // Check authentication
    if (!checkAuthentication()) {
        return;
    }

    // Setup event listeners
    setupEventListeners();

    // Fetch farmer data
    await fetchFarmerData();
}

/**
 * Check if user is authenticated
 */
function checkAuthentication() {
    farmerId = localStorage.getItem('farmer_id');

    if (!farmerId) {
        console.warn('No farmer_id found. Redirecting to login.');
        window.location.href = "farmer_health.html";
        return false;
    }

    return true;
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    backButton.addEventListener('click', handleBack);
    refreshButton.addEventListener('click', handleRefresh);
    retryButton.addEventListener('click', handleRetry);

    // Tooltip events
    document.addEventListener('mousemove', handleMouseMove);
}

// ===== DATA FETCHING =====

/**
 * Fetch farmer data from API
 */
async function fetchFarmerData() {
    showLoading();
    hideError();

    try {
        const url = `${API_BASE_URL}/farmer/${farmerId}`;
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('Farmer data not found.');
            } else if (response.status === 500) {
                throw new Error('Server error. Please try again later.');
            } else {
                throw new Error(`Failed to load data. Status: ${response.status}`);
            }
        }

        const data = await response.json();
        farmerData = data;

        // Update UI with fetched data
        updateUI(data);
        hideLoading();
        showContent();

    } catch (error) {
        console.error('Error fetching farmer data:', error);
        hideLoading();
        showError(error.message || 'Unable to load crop health data. Please try again.');
    }
}

// ===== UI UPDATES =====

/**
 * Update UI with farmer data
 */
function updateUI(data) {
    updateOverallStatus(data.overall_status);
    updateInsights(data.farmer_insight_summary);
    updateRecommendations(data.recommendations);
    updateIndicators(data.percentages);
    updateTimestamp();
}

/**
 * Update overall status section
 */
function updateOverallStatus(status) {
    if (!status) {
        statusValue.textContent = 'No data available';
        statusBadge.textContent = 'Unknown';
        return;
    }

    // Parse status (expecting format like "Good", "Excellent", "Fair", "Poor", "Critical")
    const statusText = String(status).toLowerCase();
    let statusClass = 'status-good';
    let percentage = 75;
    let badgeText = status;

    if (statusText.includes('excellent')) {
        statusClass = 'status-excellent';
        percentage = 95;
    } else if (statusText.includes('good')) {
        statusClass = 'status-good';
        percentage = 80;
    } else if (statusText.includes('fair') || statusText.includes('moderate')) {
        statusClass = 'status-fair';
        percentage = 60;
    } else if (statusText.includes('poor')) {
        statusClass = 'status-poor';
        percentage = 40;
    } else if (statusText.includes('critical')) {
        statusClass = 'status-critical';
        percentage = 20;
    }

    // Update status text
    statusValue.textContent = status;
    statusBadge.textContent = badgeText;

    // Update status color
    statusIconContainer.className = statusClass;

    // Update circular progress
    statusPercentage.textContent = `${percentage}%`;
    const circumference = 2 * Math.PI * 45; // radius = 45
    const offset = circumference - (percentage / 100) * circumference;
    const progressCircle = document.querySelector('.status-progress');
    progressCircle.style.strokeDashoffset = offset;
}

/**
 * Update insights section
 */
function updateInsights(insights) {
    if (!insights) {
        insightText.textContent = 'No insights available at this time.';
        return;
    }

    insightText.textContent = insights;
}

/**
 * Update recommendations section
 */
function updateRecommendations(recommendations) {
    if (!recommendations || !Array.isArray(recommendations) || recommendations.length === 0) {
        recommendationsList.innerHTML = `
            <div class="insight-card">
                <p class="insight-text">No recommendations available at this time.</p>
            </div>
        `;
        recommendationCount.textContent = '0 actions';
        return;
    }

    recommendationCount.textContent = `${recommendations.length} action${recommendations.length > 1 ? 's' : ''}`;

    recommendationsList.innerHTML = recommendations.map((rec, index) => {
        // Determine priority based on position or content
        let priority = 'low';
        let priorityClass = 'priority-low';

        if (index < 2) {
            priority = 'high';
            priorityClass = 'priority-high';
        } else if (index < 4) {
            priority = 'medium';
            priorityClass = 'priority-medium';
        }

        // Handle if recommendation is object or string
        const recText = typeof rec === 'string' ? rec : (rec.text || rec.recommendation || JSON.stringify(rec));

        return `
            <div class="recommendation-item" data-tooltip="${escapeHtml(recText)}">
                <div class="recommendation-number">${index + 1}</div>
                <p class="recommendation-text">${escapeHtml(recText)}</p>
                <span class="recommendation-priority ${priorityClass}">${priority}</span>
            </div>
        `;
    }).join('');

    // Add tooltip listeners to recommendations
    addTooltipListeners('.recommendation-item');
}

/**
 * Update health indicators
 */
function updateIndicators(percentages) {
    if (!percentages || typeof percentages !== 'object') {
        indicatorsGrid.innerHTML = `
            <div class="insight-card">
                <p class="insight-text">No indicator data available.</p>
            </div>
        `;
        return;
    }

    const indicators = Object.entries(percentages).map(([key, value]) => {
        // Format key name
        const name = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        
        // Parse value as percentage
        let percentage = 0;
        if (typeof value === 'number') {
            percentage = Math.min(100, Math.max(0, value));
        } else if (typeof value === 'string') {
            percentage = parseFloat(value) || 0;
        }

        return { name, percentage };
    });

    indicatorsGrid.innerHTML = indicators.map(indicator => `
        <div class="indicator-card" data-tooltip="${indicator.name}: ${indicator.percentage.toFixed(1)}%">
            <div class="indicator-header">
                <span class="indicator-name">${indicator.name}</span>
                <span class="indicator-value">${indicator.percentage.toFixed(0)}%</span>
            </div>
            <div class="indicator-bar-container">
                <div class="indicator-bar" style="width: ${indicator.percentage}%"></div>
            </div>
        </div>
    `).join('');

    // Add tooltip listeners to indicators
    addTooltipListeners('.indicator-card');
}

/**
 * Update timestamp
 */
function updateTimestamp() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    const dateString = now.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
    });
    
    lastUpdated.textContent = `Last updated: ${dateString} at ${timeString}`;
}

// ===== TOOLTIP FUNCTIONALITY =====

/**
 * Add tooltip listeners to elements
 */
function addTooltipListeners(selector) {
    const elements = document.querySelectorAll(selector);
    
    elements.forEach(element => {
        element.addEventListener('mouseenter', showTooltip);
        element.addEventListener('mouseleave', hideTooltip);
    });
}

/**
 * Show tooltip
 */
function showTooltip(event) {
    const element = event.currentTarget;
    const tooltipText = element.getAttribute('data-tooltip');
    
    if (!tooltipText) return;

    tooltipContent.textContent = tooltipText;
    tooltip.style.display = 'block';
    positionTooltip(event);
}

/**
 * Hide tooltip
 */
function hideTooltip() {
    tooltip.style.display = 'none';
}

/**
 * Position tooltip near cursor
 */
function positionTooltip(event) {
    const tooltipRect = tooltip.getBoundingClientRect();
    const x = event.clientX;
    const y = event.clientY;
    
    let left = x + 15;
    let top = y + 15;

    // Prevent tooltip from going off screen
    if (left + tooltipRect.width > window.innerWidth) {
        left = x - tooltipRect.width - 15;
    }
    
    if (top + tooltipRect.height > window.innerHeight) {
        top = y - tooltipRect.height - 15;
    }

    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
}

/**
 * Handle mouse move for tooltip positioning
 */
function handleMouseMove(event) {
    if (tooltip.style.display === 'block') {
        positionTooltip(event);
    }
}

// ===== EVENT HANDLERS =====

/**
 * Handle back button
 */
function handleBack() {
    window.location.href = BACK_URL;
}

/**
 * Handle refresh
 */
async function handleRefresh() {
    refreshButton.classList.add('spinning');
    await fetchFarmerData();
    
    setTimeout(() => {
        refreshButton.classList.remove('spinning');
    }, 1000);
}

/**
 * Handle retry
 */
function handleRetry() {
    fetchFarmerData();
}

// ===== UI STATE MANAGEMENT =====

/**
 * Show loading state
 */
function showLoading() {
    loadingOverlay.style.display = 'flex';
    mainContent.style.display = 'none';
    errorContainer.style.display = 'none';
}

/**
 * Hide loading state
 */
function hideLoading() {
    loadingOverlay.style.display = 'none';
}

/**
 * Show content
 */
function showContent() {
    mainContent.style.display = 'block';
    errorContainer.style.display = 'none';
}

/**
 * Show error
 */
function showError(message) {
    errorMessage.textContent = message;
    errorContainer.style.display = 'block';
    mainContent.style.display = 'none';
}

/**
 * Hide error
 */
function hideError() {
    errorContainer.style.display = 'none';
}

// ===== UTILITY FUNCTIONS =====

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ===== PAGE LOAD =====
window.addEventListener('DOMContentLoaded', init);

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
    if (!document.hidden && farmerData) {
        updateTimestamp();
    }
});