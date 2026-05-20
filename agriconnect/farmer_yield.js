// ===== CONFIGURATION =====
const API_BASE_URL = 'http://127.0.0.1:5000';
const BACK_URL = 'farmer_home.html';
const LOGIN_URL = 'http://127.0.0.1:5500/agriconnect/login.html';

// Constants for calculation
const BASE_YIELD = 30; // quintals
const PRICE_PER_QUINTAL = 2000; // ₹

// ===== DOM ELEMENTS =====
const loadingOverlay = document.getElementById('loadingOverlay');
const errorContainer = document.getElementById('errorContainer');
const errorMessage = document.getElementById('errorMessage');
const mainContent = document.getElementById('mainContent');
const backButton = document.getElementById('backButton');
const refreshButton = document.getElementById('refreshButton');
const retryButton = document.getElementById('retryButton');

// Yield elements
const yieldImpact = document.getElementById('yieldImpact');
const yieldRisk = document.getElementById('yieldRisk');
const estimatedLoss = document.getElementById('estimatedLoss');
const lossNote = document.getElementById('lossNote');
const baselineYield = document.getElementById('baselineYield');
const confidenceLevel = document.getElementById('confidenceLevel');
const predictionNote = document.getElementById('predictionNote');

// Factor elements
const pestSeverity = document.getElementById('pestSeverity');
const pestImpact = document.getElementById('pestImpact');
const nutrientDeficiency = document.getElementById('nutrientDeficiency');
const nutrientImpact = document.getElementById('nutrientImpact');

// Recommendations
const recommendationsList = document.getElementById('recommendationsList');

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
    updateYieldCard(data);
    updateFinancialImpact(data);
    updatePredictionDetails(data);
    updateFactors(data);
    updateRecommendations(data);
}

function updateYieldCard(data) {
    const yieldData = data.yield_prediction;
    
    if (!yieldData) {
        yieldImpact.textContent = 'No data';
        yieldRisk.textContent = 'No data';
        return;
    }

    // Yield Impact
    const impact = yieldData.predicted_yield_impact || '0%';
    yieldImpact.textContent = impact;
    yieldImpact.style.color = impact.includes('-') ? '#e65100' : '#388e3c';

    // Risk Level
    const risk = yieldData.risk_level || 'Low';
    yieldRisk.textContent = risk;
    yieldRisk.style.color = 
        risk === 'High' ? '#d32f2f' : 
        risk === 'Moderate' ? '#f57c00' : '#388e3c';
}

function updateFinancialImpact(data) {
    const yieldData = data.yield_prediction;
    
    if (!yieldData) {
        estimatedLoss.textContent = '₹ —';
        return;
    }

    // Calculate loss
    const impact = yieldData.predicted_yield_impact || '0%';
    const impactPercent = parseFloat(impact.replace('-', '').replace('%', '')) || 0;
    const totalLoss = Math.round(impactPercent * BASE_YIELD * PRICE_PER_QUINTAL / 100);

    // Animate to final value
    animateValue(estimatedLoss, 0, totalLoss, 1500, '₹ ');

    // Update note
    lossNote.textContent = `Based on ${impact} yield impact (${BASE_YIELD} quintals @ ₹${PRICE_PER_QUINTAL}/quintal)`;
}

function updatePredictionDetails(data) {
    const yieldData = data.yield_prediction;
    
    if (!yieldData) {
        baselineYield.textContent = '—';
        confidenceLevel.textContent = '—';
        predictionNote.textContent = 'No prediction data available.';
        return;
    }

    baselineYield.textContent = yieldData.baseline_yield || 'Expected';
    confidenceLevel.textContent = yieldData.confidence || 'Medium';
    predictionNote.textContent = yieldData.note || 'Decision-support estimate based on current field conditions.';
}

function updateFactors(data) {
    // Pest Factor
    const pestData = data.pest_detection_analysis;
    if (pestData) {
        pestSeverity.textContent = pestData.severity_level || 'Low';
        const pestScore = pestData.severity_score || 0;
        pestImpact.textContent = pestScore > 60 ? 'High' : pestScore > 30 ? 'Medium' : 'Low';
    } else {
        pestSeverity.textContent = '—';
        pestImpact.textContent = '—';
    }

    // Nutrient Factor
    const nutrientData = data.nutrient_deficiency_analysis;
    if (nutrientData) {
        nutrientDeficiency.textContent = nutrientData.severity_level || 'Mild';
        const defScore = nutrientData.deficiency_score || 0;
        nutrientImpact.textContent = defScore > 70 ? 'High' : defScore > 40 ? 'Medium' : 'Low';
    } else {
        nutrientDeficiency.textContent = '—';
        nutrientImpact.textContent = '—';
    }
}

function updateRecommendations(data) {
    const recommendations = data.recommendations || [];
    
    if (recommendations.length === 0) {
        recommendationsList.innerHTML = `
            <div class="card-content" style="text-align: center; color: var(--text-light);">
                No recommendations available
            </div>
        `;
        return;
    }

    const topThree = recommendations.slice(0, 3);
    recommendationsList.innerHTML = topThree.map((rec, index) => {
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

// ===== ANIMATIONS =====
function animateValue(element, start, end, duration, prefix = '') {
    let startTime = null;
    
    function animation(currentTime) {
        if (!startTime) startTime = currentTime;
        const progress = Math.min((currentTime - startTime) / duration, 1);
        
        const easeOutQuad = progress * (2 - progress);
        const currentValue = Math.floor(start + (end - start) * easeOutQuad);
        
        element.textContent = prefix + currentValue.toLocaleString('en-IN');
        
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
