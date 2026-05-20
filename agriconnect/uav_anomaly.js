// Add to your existing farmer_home.js or create uav_anomaly.js

// ===== DOM ELEMENTS (add these) =====
const anomalyCard = document.getElementById('anomalyCard');
const anomalyStatus = document.getElementById('anomalyStatus');
const anomalyLevel = document.getElementById('anomalyLevel');
const anomalyTypes = document.getElementById('anomalyTypes');
const anomalyConfidence = document.getElementById('anomalyConfidence');
const anomalyImpact = document.getElementById('anomalyImpact');
const anomalyActions = document.getElementById('anomalyActions');
const officerAlertBadge = document.getElementById('officerAlertBadge');

// ===== ANOMALY UPDATE FUNCTION =====
function updateAnomalyCard(data) {
    const anomaly = data.anomaly_analysis;
    
    if (!anomaly) {
        // Hide anomaly card if no data
        anomalyCard.style.display = 'none';
        return;
    }
    
    anomalyCard.style.display = 'block';
    
    // Update status text
    anomalyStatus.textContent = anomaly.anomaly_detected ? 'Anomaly Detected' : 'System Normal';
    
    // Update level with color coding
    anomalyLevel.textContent = anomaly.anomaly_level;
    anomalyLevel.className = 'anomaly-level';
    
    if (anomaly.anomaly_level === 'High') {
        anomalyLevel.classList.add('level-high');
        anomalyCard.classList.add('card-alert-high');
        anomalyCard.classList.remove('card-alert-medium', 'card-alert-low');
    } else if (anomaly.anomaly_level === 'Medium') {
        anomalyLevel.classList.add('level-medium');
        anomalyCard.classList.add('card-alert-medium');
        anomalyCard.classList.remove('card-alert-high', 'card-alert-low');
    } else {
        anomalyLevel.classList.add('level-low');
        anomalyCard.classList.add('card-alert-low');
        anomalyCard.classList.remove('card-alert-high', 'card-alert-medium');
    }
    
    // Update anomaly types
    if (anomaly.anomaly_type && anomaly.anomaly_type.length > 0) {
        anomalyTypes.innerHTML = anomaly.anomaly_type.map(type => 
            `<span class="anomaly-tag">${escapeHtml(type)}</span>`
        ).join('');
    } else {
        anomalyTypes.innerHTML = '<span class="anomaly-tag anomaly-tag-success">None</span>';
    }
    
    // Update confidence
    const confidenceValue = anomaly.confidence || 0;
    anomalyConfidence.textContent = `${confidenceValue}%`;
    anomalyConfidence.style.color = confidenceValue > 50 ? '#d32f2f' : confidenceValue > 25 ? '#f57c00' : '#388e3c';
    
    // Animate confidence bar
    const confidenceBar = document.getElementById('confidenceBar');
    if (confidenceBar) {
        confidenceBar.style.width = `${confidenceValue}%`;
        confidenceBar.className = 'confidence-bar';
        if (confidenceValue > 50) {
            confidenceBar.classList.add('bar-high');
        } else if (confidenceValue > 25) {
            confidenceBar.classList.add('bar-medium');
        } else {
            confidenceBar.classList.add('bar-low');
        }
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

// ===== ADD TO YOUR EXISTING updateUI FUNCTION =====
function updateUI(data) {
    // ... your existing UI updates ...
    
    // Add this line
    updateAnomalyCard(data);
}