// ===== CONFIGURATION =====
const API_BASE_URL = 'http://127.0.0.1:5000';
const BACK_URL = 'farmer_home.html';

// ===== DOM ELEMENTS =====
const loadingOverlay = document.getElementById('loadingOverlay');
const errorContainer = document.getElementById('errorContainer');
const errorMessage = document.getElementById('errorMessage');
const mainContent = document.getElementById('mainContent');
const backButton = document.getElementById('backButton');
const refreshButton = document.getElementById('refreshButton');
const retryButton = document.getElementById('retryButton');

// Overview elements
const totalZones = document.getElementById('totalZones');
const riskZones = document.getElementById('riskZones');
const healthyZones = document.getElementById('healthyZones');

// Filter elements
const filterButtons = document.querySelectorAll('.filter-btn');

// Zone elements
const zonesGrid = document.getElementById('zonesGrid');

// Modal elements
const zoneModal = document.getElementById('zoneModal');
const modalOverlay = document.getElementById('modalOverlay');
const modalClose = document.getElementById('modalClose');
const modalBody = document.getElementById('modalBody');

// ===== STATE =====
let farmerId = null;
let farmerData = null;
let currentFilter = 'all';

// ===== INITIALIZATION =====

async function init() {
    if (!checkAuthentication()) {
        return;
    }

    setupEventListeners();
    await fetchFarmerData();
}

function checkAuthentication() {
    farmerId = localStorage.getItem('farmer_id');

    if (!farmerId) {
        console.warn('No farmer_id found. Redirecting to login.');
        window.location.href = "farmer_health.html";
        return false;
    }

    return true;
}

function setupEventListeners() {
    backButton.addEventListener('click', handleBack);
    refreshButton.addEventListener('click', handleRefresh);
    retryButton.addEventListener('click', handleRetry);
    
    // Filter buttons
    filterButtons.forEach(btn => {
        btn.addEventListener('click', handleFilter);
    });
    
    // Modal
    modalClose.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', closeModal);
}

// ===== DATA FETCHING =====

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

        updateUI(data);
        hideLoading();
        showContent();

    } catch (error) {
        console.error('Error fetching farmer data:', error);
        hideLoading();
        showError(error.message || 'Unable to load field zone data. Please try again.');
    }
}

// ===== UI UPDATES =====
function mapBackendZones(zoneMap) {
    return zoneMap.map((z, index) => ({
        zone_id: z.zone,
        zone_name: `Zone ${z.zone}`,
        risk_level: z.risk,
        health_percentage:
            z.status === 'Healthy' ? 90 :
            z.status === 'Stressed' ? 60 : 30,
        crop_type: 'Crop',
        soil_type: 'Soil',
        issues: z.status !== 'Healthy' ? [z.status] : [],
        recommendations: []
    }));
}

function updateUI(data) {
    const zones = mapBackendZones(data.zone_map || []);
    updateOverview(zones);
    updateZones(zones);
}

function updateOverview(zones) {

    
    // Total zones
    totalZones.textContent = zones.length;
    
    // Risk zones (high + medium)
    const highRisk = zones.filter(z => getRiskLevel(z.risk_level) === 'high').length;
    const mediumRisk = zones.filter(z => getRiskLevel(z.risk_level) === 'medium').length;
    riskZones.textContent = highRisk + mediumRisk;
    
    // Healthy zones (low risk)
    const lowRisk = zones.filter(z => getRiskLevel(z.risk_level) === 'low').length;
    healthyZones.textContent = lowRisk;
}

function updateZones(zones) {
    if (!zones || zones.length === 0) {
        zonesGrid.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="3" width="18" height="18" rx="2"/>
                    <line x1="3" y1="9" x2="21" y2="9"/>
                    <line x1="9" y1="21" x2="9" y2="9"/>
                </svg>
                <h3>No Zones Found</h3>
                <p>No field zone data available at this time.</p>
            </div>
        `;
        return;
    }

    // Filter zones
    const filteredZones = zones.filter(zone => {
        if (currentFilter === 'all') return true;
        return getRiskLevel(zone.risk_level) === currentFilter;
    });

    if (filteredZones.length === 0) {
        zonesGrid.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <h3>No Matching Zones</h3>
                <p>No zones found for the selected filter.</p>
            </div>
        `;
        return;
    }

    zonesGrid.innerHTML = filteredZones.map((zone, index) => {
        const riskLevel = getRiskLevel(zone.risk_level);
        const riskText = getRiskText(zone.risk_level);
        const healthPercentage = zone.health_percentage || 75;
        const issueCount = zone.issues ? zone.issues.length : 0;
        
        return `
            <div class="zone-card risk-${riskLevel}" data-zone-id="${zone.zone_id || index}">
                <div class="zone-header">
                    <div class="zone-title-group">
                        <h3 class="zone-name">${escapeHtml(zone.zone_name || `Zone ${index + 1}`)}</h3>
                        <p class="zone-size">
                            ${zone.issues && zone.issues.length > 0
                                ? escapeHtml(zone.issues.join(', '))
                                : 'No disease detected'}
                               </p>

                    </div>
                    <span class="zone-risk-badge ${riskLevel}">${riskText}</span>
                </div>
                
                <div class="zone-status-bar">
                    <div class="status-bar-fill" style="width: ${healthPercentage}%"></div>
                </div>
                
                <div class="zone-footer">
                    <span class="zone-issues">
                        ${issueCount > 0 ? `<strong>${issueCount}</strong> issue${issueCount > 1 ? 's' : ''} detected` : 'No issues detected'}
                    </span>
                    <button class="view-details-btn" onclick="openZoneModal(${index})">
                        View Details
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="5" y1="12" x2="19" y2="12"/>
                            <polyline points="12 5 19 12 12 19"/>
                        </svg>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function getRiskLevel(risk) {
    if (!risk) return 'low';
    const riskLower = String(risk).toLowerCase();
    
    if (riskLower.includes('high') || riskLower.includes('critical')) {
        return 'high';
    } else if (riskLower.includes('medium') || riskLower.includes('moderate')) {
        return 'medium';
    } else {
        return 'low';
    }
}

function getRiskText(risk) {
    if (!risk) return 'Low Risk';
    const riskLower = String(risk).toLowerCase();
    
    if (riskLower.includes('high') || riskLower.includes('critical')) {
        return 'High Risk';
    } else if (riskLower.includes('medium') || riskLower.includes('moderate')) {
        return 'Medium Risk';
    } else {
        return 'Low Risk';
    }
}

// ===== FILTER HANDLING =====

function handleFilter(event) {
    const btn = event.currentTarget;
    const filter = btn.getAttribute('data-filter');
    
    // Update active state
    filterButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    // Update filter
    currentFilter = filter;
    
    // Update zones
    if (farmerData) {
        mapBackendZones(farmerData.zone_map || [])
    }
}

// ===== MODAL HANDLING =====

function openZoneModal(zoneIndex) {
    if (!farmerData || !farmerData.zones) return;
    
    const zones =mapBackendZones(farmerData.zone_map || []);
    const zone = zones[zoneIndex];
    if (!zone) return;
    
    const riskLevel = getRiskLevel(zone.risk_level);
    const riskText = getRiskText(zone.risk_level);
    const healthPercentage = zone.health_percentage || 75;
    
    modalBody.innerHTML = `
        <h2 class="modal-zone-name">${escapeHtml(zone.zone_name || `Zone ${zoneIndex + 1}`)}</h2>
        
        <div class="modal-section">
            <h3>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="16" x2="12" y2="12"/>
                    <line x1="12" y1="8" x2="12.01" y2="8"/>
                </svg>
                Basic Information
            </h3>
            <div class="modal-detail-item">
                <span class="detail-label">Zone Size</span>
                <span class="detail-value">${escapeHtml(zone.zone_size || 'N/A')}</span>
            </div>
            <div class="modal-detail-item">
                <span class="detail-label">Crop Type</span>
                <span class="detail-value">${escapeHtml(zone.crop_type || 'Unknown')}</span>
            </div>
            <div class="modal-detail-item">
                <span class="detail-label">Soil Type</span>
                <span class="detail-value">${escapeHtml(zone.soil_type || 'Unknown')}</span>
            </div>
            <div class="modal-detail-item">
                <span class="detail-label">Risk Level</span>
                <span class="detail-value zone-risk-badge ${riskLevel}">${riskText}</span>
            </div>
            <div class="modal-detail-item">
                <span class="detail-label">Health Status</span>
                <span class="detail-value">${healthPercentage}%</span>
            </div>
        </div>
        
        ${zone.issues && zone.issues.length > 0 ? `
            <div class="modal-section">
                <h3>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                        <line x1="12" y1="9" x2="12" y2="13"/>
                        <line x1="12" y1="17" x2="12.01" y2="17"/>
                    </svg>
                    Detected Issues
                </h3>
                ${zone.issues.map(issue => `
                    <div class="modal-detail-item">
                        <span class="detail-label">${escapeHtml(typeof issue === 'string' ? issue : issue.type || 'Issue')}</span>
                        <span class="detail-value">${escapeHtml(typeof issue === 'string' ? 'Detected' : issue.severity || 'Unknown')}</span>
                    </div>
                `).join('')}
            </div>
        ` : ''}
        
        ${zone.recommendations && zone.recommendations.length > 0 ? `
            <div class="modal-section">
                <h3>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="9 11 12 14 22 4"/>
                        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                    </svg>
                    Recommendations
                </h3>
                ${zone.recommendations.map((rec, i) => `
                    <div class="modal-detail-item">
                        <span class="detail-label">${i + 1}.</span>
                        <span class="detail-value" style="text-align: right;">${escapeHtml(typeof rec === 'string' ? rec : rec.action || '')}</span>
                    </div>
                `).join('')}
            </div>
        ` : ''}
    `;
    
    zoneModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    zoneModal.style.display = 'none';
    document.body.style.overflow = '';
}

// Make openZoneModal globally accessible
window.openZoneModal = openZoneModal;

// ===== EVENT HANDLERS =====

function handleBack() {
    window.location.href = BACK_URL;
}

async function handleRefresh() {
    refreshButton.classList.add('spinning');
    await fetchFarmerData();
    
    setTimeout(() => {
        refreshButton.classList.remove('spinning');
    }, 1000);
}

function handleRetry() {
    fetchFarmerData();
}

// ===== UI STATE MANAGEMENT =====

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
    errorContainer.style.display = 'none';
}

function showError(message) {
    errorMessage.textContent = message;
    errorContainer.style.display = 'block';
    mainContent.style.display = 'none';
}

function hideError() {
    errorContainer.style.display = 'none';
}

// ===== UTILITY FUNCTIONS =====

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ===== PAGE LOAD =====
window.addEventListener('DOMContentLoaded', init);

// Close modal on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && zoneModal.style.display === 'flex') {
        closeModal();
    }
});