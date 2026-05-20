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

const statusBanner = document.getElementById('statusBanner');
const overallStatus = document.getElementById('overallStatus');
const statusDescription = document.getElementById('statusDescription');
const recommendationsGrid = document.getElementById('recommendationsGrid');
const emptyState = document.getElementById('emptyState');

// ===== STATE =====
let farmerId = null;
let farmerData = null;

// ===== DISEASE TREATMENTS DATABASE =====
const DISEASE_TREATMENTS = {
    'Early Blight': {
        fungicide: 'Mancozeb',
        dosage: '2.5 kg per acre',
        interval: 'spray every 7-10 days',
        alternative: 'Chlorothalonil 1.5 L/acre'
    },
    'Late Blight': {
        fungicide: 'Chlorothalonil',
        dosage: '1.5 L per acre',
        interval: 'spray every 5-7 days',
        alternative: 'Metalaxyl + Mancozeb 2 kg/acre'
    },
    'Bacterial Wilt': {
        treatment: 'Streptomycin sulfate',
        dosage: '200 ppm solution',
        interval: 'apply every 10 days',
        alternative: 'Copper oxychloride 3 g/L'
    },
    'Powdery Mildew': {
        fungicide: 'Sulfur',
        dosage: '3 kg per acre',
        interval: 'spray every 14 days',
        alternative: 'Triadimefon 0.5 g/L'
    },
    'Anthracnose': {
        fungicide: 'Carbendazim',
        dosage: '1 g per litre',
        interval: 'spray every 10 days',
        alternative: 'Copper fungicide 2.5 g/L'
    }
};

// ===== NUTRIENT TREATMENTS DATABASE =====
const NUTRIENT_TREATMENTS = {
    'Nitrogen': {
        fertilizer: 'Urea',
        soilDosage: '100 kg per acre',
        foliarDosage: '2% solution spray',
        application: 'Split application: 50% at planting, 50% at 30 days',
        alternative: 'DAP (Diammonium Phosphate) 75 kg/acre'
    },
    'Potassium': {
        fertilizer: 'Muriate of Potash (MOP)',
        soilDosage: '50 kg per acre',
        foliarDosage: '1% K2O solution',
        application: 'Apply during vegetative growth stage',
        alternative: 'Sulphate of Potash 40 kg/acre'
    },
    'Phosphorus': {
        fertilizer: 'Single Super Phosphate (SSP)',
        soilDosage: '150 kg per acre',
        foliarDosage: 'Not recommended',
        application: 'Basal application before planting',
        alternative: 'DAP 100 kg/acre'
    },
    'Calcium': {
        fertilizer: 'Calcium Nitrate',
        soilDosage: '40 kg per acre',
        foliarDosage: '0.5% solution spray',
        application: 'Apply during fruit development',
        alternative: 'Gypsum 200 kg/acre'
    },
    'Magnesium': {
        fertilizer: 'Magnesium Sulfate',
        soilDosage: '25 kg per acre',
        foliarDosage: '1% solution spray',
        application: 'Apply when deficiency symptoms appear',
        alternative: 'Dolomite 100 kg/acre'
    }
};

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
        
        if (!response.ok) throw new Error('Failed to load farmer data');
        
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
    updateStatusBanner(data);
    generateRecommendations(data);
}

function updateStatusBanner(data) {
    const status = data.overall_status || 'Unknown';
    overallStatus.textContent = status;
    
    // Update banner styling based on status
    statusBanner.classList.remove('warning', 'safe');
    if (status.includes('High Risk')) {
        statusBanner.classList.add('urgent');
        statusDescription.textContent = `Immediate action required. Multiple critical issues detected across ${data.percentages?.Diseased || 0}% of field area.`;
    } else if (status.includes('Moderate') || status.includes('Medium')) {
        statusBanner.classList.add('warning');
        statusDescription.textContent = `Preventive measures recommended. Field showing early stress indicators.`;
    } else {
        statusBanner.classList.add('safe');
        statusDescription.textContent = `Field conditions stable. Continue routine monitoring and maintenance.`;
    }
}

function generateRecommendations(data) {
    const recommendations = [];
    
    // Disease-based recommendations
    if (data.most_likely_disease && data.most_likely_disease.length > 0) {
        data.most_likely_disease.forEach((disease, index) => {
            const treatment = DISEASE_TREATMENTS[disease];
            if (treatment) {
                const highRiskZones = getHighRiskZones(data.zone_map);
                recommendations.push(createDiseaseRecommendation(disease, treatment, highRiskZones, index));
            }
        });
    }
    
    // Nutrient deficiency recommendations
    if (data.nutrient_deficiency_analysis && data.nutrient_deficiency_analysis.likely_nutrients) {
        const severity = data.nutrient_deficiency_analysis.severity_level || 'Moderate';
        data.nutrient_deficiency_analysis.likely_nutrients.forEach((nutrient, index) => {
            const treatment = NUTRIENT_TREATMENTS[nutrient];
            if (treatment) {
                recommendations.push(createNutrientRecommendation(nutrient, treatment, severity, data.zone_map));
            }
        });
    }
    
    // Pest-based recommendations
    if (data.pest_detection_analysis) {
        const pestRec = createPestRecommendation(data.pest_detection_analysis, data.zone_map);
        if (pestRec) recommendations.push(pestRec);
    }
    
    // Zone-specific recommendations
    const criticalZones = getCriticalZones(data.zone_map);
    if (criticalZones.length > 0) {
        recommendations.push(createZoneMonitoringRecommendation(criticalZones));
    }
    
    renderRecommendations(recommendations);
}

function createDiseaseRecommendation(disease, treatment, zones, priority) {
    const urgency = priority === 0 ? 'high' : 'medium';
    const urgencyClass = priority === 0 ? 'urgent' : 'priority';
    
    return {
        class: urgencyClass,
        category: 'Disease Control',
        title: `${disease} Treatment Protocol`,
        urgency: urgency,
        description: `Apply ${treatment.fungicide} immediately to infected zones. ${treatment.alternative ? 'Alternative: ' + treatment.alternative : ''}`,
        details: [
            {
                icon: 'droplet',
                label: 'Dosage',
                value: treatment.dosage
            },
            {
                icon: 'clock',
                label: 'Application Frequency',
                value: treatment.interval
            },
            {
                icon: 'map-pin',
                label: 'Target Zones',
                value: zones.length > 0 ? zones.map(z => `Zone ${z}`).join(', ') : 'All affected areas'
            }
        ]
    };
}

function createNutrientRecommendation(nutrient, treatment, severity, zoneMap) {
    const urgency = severity === 'Severe' ? 'high' : severity === 'Moderate' ? 'medium' : 'low';
    const urgencyClass = severity === 'Severe' ? 'urgent' : severity === 'Moderate' ? 'priority' : 'routine';
    
    const stressedZones = getStressedZones(zoneMap);
    
    return {
        class: urgencyClass,
        category: 'Nutrient Management',
        title: `${nutrient} Deficiency Correction`,
        urgency: urgency,
        description: `${treatment.fertilizer} application required. ${treatment.application}`,
        details: [
            {
                icon: 'package',
                label: 'Soil Application',
                value: treatment.soilDosage
            },
            {
                icon: 'cloud-rain',
                label: 'Foliar Spray',
                value: treatment.foliarDosage
            },
            {
                icon: 'target',
                label: 'Focus Areas',
                value: stressedZones.length > 0 ? stressedZones.map(z => `Zone ${z}`).join(', ') : 'Entire field'
            }
        ]
    };
}

function createPestRecommendation(pestData, zoneMap) {
    const severity = pestData.severity_level || 'Moderate';
    const pestType = pestData.pest_type || 'Pest infestation';
    const urgency = severity === 'Severe' ? 'high' : 'medium';
    const urgencyClass = severity === 'Severe' ? 'urgent' : 'priority';
    
    const affectedZones = getHighRiskZones(zoneMap);
    
    let treatment, interval;
    if (pestType.toLowerCase().includes('fungal')) {
        treatment = 'Systemic fungicide with contact action';
        interval = 'Spray every 7 days for 3 weeks';
    } else if (pestType.toLowerCase().includes('insect')) {
        treatment = 'Integrated pest management with targeted insecticide';
        interval = 'Weekly monitoring and spot treatment';
    } else {
        treatment = 'Broad-spectrum treatment based on diagnosis';
        interval = 'Follow integrated pest management protocol';
    }
    
    return {
        class: urgencyClass,
        category: 'Pest Management',
        title: `${pestType} Control`,
        urgency: urgency,
        description: `${treatment}. Implement quarantine measures for affected zones to prevent spread.`,
        details: [
            {
                icon: 'alert-triangle',
                label: 'Severity',
                value: severity
            },
            {
                icon: 'repeat',
                label: 'Treatment Schedule',
                value: interval
            },
            {
                icon: 'map',
                label: 'Affected Zones',
                value: affectedZones.length > 0 ? affectedZones.map(z => `Zone ${z}`).join(', ') : 'Multiple zones'
            }
        ]
    };
}

function createZoneMonitoringRecommendation(zones) {
    return {
        class: 'priority',
        category: 'Field Monitoring',
        title: 'Enhanced Zone Surveillance',
        urgency: 'medium',
        description: `Increase monitoring frequency for critical zones. Deploy soil sensors and conduct daily visual inspections.`,
        details: [
            {
                icon: 'eye',
                label: 'Inspection Frequency',
                value: 'Daily monitoring required'
            },
            {
                icon: 'activity',
                label: 'Parameters',
                value: 'Moisture, temperature, plant health'
            },
            {
                icon: 'layers',
                label: 'Priority Zones',
                value: zones.map(z => `Zone ${z}`).join(', ')
            }
        ]
    };
}

function renderRecommendations(recommendations) {
    if (recommendations.length === 0) {
        recommendationsGrid.style.display = 'none';
        emptyState.style.display = 'block';
        return;
    }
    
    recommendationsGrid.style.display = 'grid';
    emptyState.style.display = 'none';
    
    recommendationsGrid.innerHTML = recommendations.map(rec => `
        <div class="recommendation-card ${rec.class}">
            <div class="rec-header">
                <div class="rec-icon">
                    ${getIconSVG(rec.category)}
                </div>
                <div class="rec-header-content">
                    <div class="rec-category">${rec.category}</div>
                    <h3 class="rec-title">${rec.title}</h3>
                    <div class="urgency-badge ${rec.urgency}">
                        <span class="urgency-dot"></span>
                        ${rec.urgency} priority
                    </div>
                </div>
            </div>
            
            <div class="rec-description">
                ${rec.description}
            </div>
            
            <div class="rec-details">
                ${rec.details.map(detail => `
                    <div class="rec-detail-item">
                        <div class="detail-icon">
                            ${getDetailIconSVG(detail.icon)}
                        </div>
                        <div class="detail-content">
                            <div class="detail-label">${detail.label}</div>
                            <div class="detail-value ${detail.highlight ? 'highlight' : ''}">${detail.value}</div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `).join('');
}

// ===== HELPER FUNCTIONS =====
function getHighRiskZones(zoneMap) {
    if (!zoneMap) return [];
    return zoneMap.filter(z => z.risk === 'High').map(z => z.zone);
}

function getStressedZones(zoneMap) {
    if (!zoneMap) return [];
    return zoneMap.filter(z => z.status === 'Stressed').map(z => z.zone);
}

function getCriticalZones(zoneMap) {
    if (!zoneMap) return [];
    return zoneMap.filter(z => z.risk === 'High' || z.status === 'Diseased').map(z => z.zone);
}

function getIconSVG(category) {
    const icons = {
        'Disease Control': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
        'Nutrient Management': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
        'Pest Management': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
        'Field Monitoring': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>'
    };
    return icons[category] || icons['Field Monitoring'];
}

function getDetailIconSVG(iconName) {
    const icons = {
        'droplet': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>',
        'clock': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
        'map-pin': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>',
        'package': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>',
        'cloud-rain': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="16" y1="13" x2="16" y2="21"/><line x1="8" y1="13" x2="8" y2="21"/><line x1="12" y1="15" x2="12" y2="23"/><path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25"/></svg>',
        'target': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>',
        'alert-triangle': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
        'repeat': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>',
        'map': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>',
        'eye': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',
        'activity': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>',
        'layers': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>'
    };
    return icons[iconName] || icons['target'];
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

// ===== START =====
window.addEventListener('DOMContentLoaded', init);