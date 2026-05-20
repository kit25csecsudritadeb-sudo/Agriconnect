// ===== CONFIGURATION =====
const API_BASE_URL = 'http://127.0.0.1:5000';
const BACK_URL = 'farmer_home.html';
const LOGIN_URL = 'http://127.0.0.1:5500/agriconnect/login.html';

// ===== DOM ELEMENTS =====
const loadingOverlay = document.getElementById('loadingOverlay');
const errorContainer = document.getElementById('errorContainer');
const errorMessage = document.getElementById('errorMessage');
const mainContent = document.getElementById('mainContent');
const backButton = document.getElementById('backButton');
const refreshButton = document.getElementById('refreshButton');
const retryButton = document.getElementById('retryButton');

// Nutrient elements
const scoreValue = document.getElementById('scoreValue');
const nutrientSeverity = document.getElementById('nutrientSeverity');
const deficiencyMeter = document.getElementById('deficiencyMeter');
const deficiencyValue = document.getElementById('deficiencyValue');
const nutrientsList = document.getElementById('nutrientsList');
const nutrientSuggestion = document.getElementById('nutrientSuggestion');
const indicatorsGrid = document.getElementById('indicatorsGrid');

// ===== STATE =====
let farmerId = null;
let farmerData = null;

// ===== INITIALIZATION =====
async function init() {
    if (!checkAuthentication()) return;
    setupEventListeners();
    await fetchFarmerData();
}

function checkAuthentication() {
    farmerId = localStorage.getItem('farmer_id');
    if (!farmerId) {
        window.location.href = LOGIN_URL;
        return false;
    }
    return true;
}

function setupEventListeners() {
    backButton.addEventListener('click', () => window.location.href = BACK_URL);
    refreshButton.addEventListener('click', handleRefresh);
    retryButton.addEventListener('click', () => fetchFarmerData());
}

// ===== DATA FETCHING =====
async function fetchFarmerData() {
    showLoading();
    hideError();

    try {
        const url = `${API_BASE_URL}/farmer/${farmerId}`;
        const response = await fetch(url);
        
        if (!response.ok) throw new Error('Failed to load data');
        
        const data = await response.json();
        farmerData = data;
        
        updateUI(data);
        hideLoading();
        showContent();
    } catch (error) {
        console.error(error);
        hideLoading();
        showError(error.message);
    }
}

// ===== UI UPDATES =====
function updateUI(data) {
    updateNutrientCard(data);
    updateNutrientsList(data);
    updateSuggestion(data);
    updateIndicators(data);
}

function updateNutrientCard(data) {
    const nutrientData = data.nutrient_deficiency_analysis;
    
    if (!nutrientData) {
        scoreValue.textContent = '—';
        nutrientSeverity.textContent = 'No data';
        return;
    }

    // Calculate score (100 - deficiency_score)
    const deficiencyScore = nutrientData.deficiency_score || 0;
    const healthScore = Math.round(100 - deficiencyScore);
    
    // Animate score
    animateValue(scoreValue, 0, healthScore, 1500);

    // Update severity badge
    const severity = (nutrientData.severity_level || 'Mild').toLowerCase();
    nutrientSeverity.textContent = nutrientData.severity_level || 'Mild';
    nutrientSeverity.className = `severity-badge severity-${severity}`;

    // Update deficiency meter
    deficiencyValue.textContent = `${Math.round(deficiencyScore)}%`;
    setTimeout(() => {
        deficiencyMeter.style.width = `${deficiencyScore}%`;
    }, 300);
}

function updateNutrientsList(data) {
    const nutrientData = data.nutrient_deficiency_analysis;
    
    if (!nutrientData || !nutrientData.likely_nutrients || nutrientData.likely_nutrients.length === 0) {
        nutrientsList.innerHTML = `
            <div class="nutrient-badge" style="grid-column: 1 / -1;">
                <div class="nutrient-icon">✓</div>
                <p class="nutrient-name">No Deficiencies Detected</p>
            </div>
        `;
        return;
    }

    const nutrients = nutrientData.likely_nutrients;
    const nutrientIcons = {
        'Nitrogen': '🌿',
        'Phosphorus': '💧',
        'Potassium': '⚡',
        'Calcium': '🦴',
        'Magnesium': '🧲',
        'Sulfur': '🔥'
    };

    nutrientsList.innerHTML = nutrients.map(nutrient => `
        <div class="nutrient-badge">
            <div class="nutrient-icon">${nutrientIcons[nutrient] || '🌱'}</div>
            <p class="nutrient-name">${escapeHtml(nutrient)}</p>
        </div>
    `).join('');
}

function updateSuggestion(data) {
    const nutrientData = data.nutrient_deficiency_analysis;
    
    if (!nutrientData) {
        nutrientSuggestion.textContent = 'No data available.';
        return;
    }

    const nutrients = nutrientData.likely_nutrients || [];
    const severity = nutrientData.severity_level || 'Mild';

    if (nutrients.length > 0) {
        const days = severity === 'Critical' ? 3 : severity === 'Severe' ? 5 : 7;
        nutrientSuggestion.textContent = 
            `Apply ${nutrients.join(' and ')} fertilizer within ${days} days to restore nutrient balance.`;
    } else {
        nutrientSuggestion.textContent = 
            'Nutrient levels appear adequate. Continue regular monitoring and maintain current fertilization schedule.';
    }
}

function updateIndicators(data) {
    const percentages = data.percentages || {};
    
    if (Object.keys(percentages).length === 0) {
        indicatorsGrid.innerHTML = '<p style="text-align: center; color: var(--text-light);">No indicator data</p>';
        return;
    }

    const indicators = Object.entries(percentages).map(([key, value]) => {
        const name = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        const percentage = Math.min(100, Math.max(0, parseFloat(value) || 0));
        return { name, percentage };
    });

    indicatorsGrid.innerHTML = indicators.map(indicator => `
        <div class="indicator-card">
            <div class="indicator-header">
                <span class="indicator-name">${indicator.name}</span>
                <span class="indicator-value">${indicator.percentage.toFixed(0)}%</span>
            </div>
            <div class="indicator-bar-container">
                <div class="indicator-bar" style="width: ${indicator.percentage}%"></div>
            </div>
        </div>
    `).join('');
}

// ===== ANIMATIONS =====
function animateValue(element, start, end, duration) {
    let startTime = null;
    
    function animation(currentTime) {
        if (!startTime) startTime = currentTime;
        const progress = Math.min((currentTime - startTime) / duration, 1);
        
        const easeOutQuad = progress * (2 - progress);
        const currentValue = Math.floor(start + (end - start) * easeOutQuad);
        
        element.textContent = currentValue;
        
        if (progress < 1) {
            requestAnimationFrame(animation);
        }
    }
    
    requestAnimationFrame(animation);
}

// ===== EVENT HANDLERS =====
async function handleRefresh() {
    refreshButton.classList.add('spinning');
    await fetchFarmerData();
    setTimeout(() => refreshButton.classList.remove('spinning'), 1000);
}

// ===== UI STATE =====
function showLoading() {
    loadingOverlay.style.display = 'flex';
    mainContent.style.display = 'none';
    errorContainer.style.display = 'none';
}

function hideLoading() {
    loadingOverlay.style.display = 'none';
}

function showContent() {
    mainContent.style.display = 'block';
}

function showError(message) {
    errorMessage.textContent = message;
    errorContainer.style.display = 'block';
    mainContent.style.display = 'none';
}

function hideError() {
    errorContainer.style.display = 'none';
}

// ===== UTILITIES =====
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ===== START =====
window.addEventListener('DOMContentLoaded', init);