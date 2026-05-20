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
    updatePestCard(data);
    updateZoneMap(data);
    updateRecommendations(data);
}

function updatePestCard(data) {
    const pestData = data.pest_detection_analysis;
    
    if (!pestData) {
        document.getElementById('pestType').textContent = 'No data';
        return;
    }

    document.getElementById('pestType').textContent = pestData.pest_type || 'Unknown';
    
    const severityEl = document.getElementById('pestSeverity');
    const severity = (pestData.severity_level || 'Low').toLowerCase();
    severityEl.textContent = pestData.severity_level || 'Low';
    severityEl.className = `severity-badge severity-${severity}`;

    const priorityEl = document.getElementById('pestPriority');
    const priority = (pestData.priority_tag || 'Monitor').toLowerCase().replace(' ', '-');
    priorityEl.textContent = pestData.priority_tag || 'Monitor';
    priorityEl.className = `priority-badge priority-${priority}`;

    document.getElementById('pestScore').textContent = pestData.severity_score || '—';

    const zones = pestData.affected_zones || [];
    document.getElementById('pestZones').textContent = 
        zones.length > 0 ? zones.join(', ') : 'None';
}

function updateZoneMap(data) {
    const zoneMap = data.zone_map || [];
    const container = document.getElementById('zoneList');

    if (zoneMap.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-light);">No zone data</p>';
        return;
    }

    container.innerHTML = zoneMap.map(zone => {
        const riskClass = (zone.risk || 'Low').toLowerCase().replace(' ', '-');
        return `
            <div class="zone-item risk-${riskClass}">
                <div class="zone-info">
                    <div class="zone-number">${zone.zone}</div>
                    <span class="zone-status">${zone.status || 'Unknown'}</span>
                </div>
                <span class="zone-risk severity-badge severity-${riskClass}">
                    ${zone.risk || 'Low'}
                </span>
            </div>
        `;
    }).join('');
}

function updateRecommendations(data) {
    const recommendations = data.recommendations || [];
    const container = document.getElementById('recommendationsList');

    if (recommendations.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-light);">No recommendations</p>';
        return;
    }

    const topThree = recommendations.slice(0, 3);
    container.innerHTML = topThree.map((rec, index) => {
        let priority = 'low';
        if (index === 0) priority = 'high';
        else if (index === 1) priority = 'medium';

        const recText = typeof rec === 'string' ? rec : (rec.text || JSON.stringify(rec));
        return `
            <div class="recommendation-item">
                <div class="rec-priority ${priority}"></div>
                <p class="rec-text">${escapeHtml(recText)}</p>
            </div>
        `;
    }).join('');
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