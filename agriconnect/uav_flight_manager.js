/**
 * UAV Flight Manager
 * Handles flight planning, data storage, and flight execution simulation
 */

// ===== FLIGHT CONFIGURATION =====
const UAV_CONFIG = {
    // Flight parameters
    altitude: 50, // meters
    speed: 5, // m/s
    imageInterval: 3, // seconds between captures
    
    // Field dimensions (adjust based on actual field)
    fieldWidth: 100, // meters
    fieldLength: 150, // meters
    
    // Flight pattern
    pattern: 'grid', // 'grid', 'spiral', 'perimeter'
    overlap: 30, // percentage overlap between passes
    
    // Timing
    setupTime: 120, // 2 minutes pre-flight check
    landingTime: 60, // 1 minute landing procedure
};

// ===== FLIGHT PATH CALCULATOR =====
class FlightPathCalculator {
    
    /**
     * Calculate complete flight path for grid pattern
     */
    static calculateGridPath(fieldWidth, fieldLength, overlap = 30) {
        const paths = [];
        const droneWidth = 20; // meters (camera coverage width)
        const effectiveWidth = droneWidth * (1 - overlap / 100);
        const numPasses = Math.ceil(fieldLength / effectiveWidth);
        
        let currentY = 0;
        let direction = 1; // 1 = left-to-right, -1 = right-to-left
        
        for (let pass = 0; pass < numPasses; pass++) {
            const startX = direction === 1 ? 0 : fieldWidth;
            const endX = direction === 1 ? fieldWidth : 0;
            
            paths.push({
                passNumber: pass + 1,
                startPosition: { x: startX, y: currentY },
                endPosition: { x: endX, y: currentY },
                direction: direction === 1 ? 'East' : 'West',
                altitude: UAV_CONFIG.altitude
            });
            
            currentY += effectiveWidth;
            direction *= -1; // Alternate direction
        }
        
        return paths;
    }
    
    /**
     * Calculate waypoints for entire flight
     */
    static calculateWaypoints(paths) {
        const waypoints = [];
        let waypointId = 1;
        
        // Takeoff point
        waypoints.push({
            id: waypointId++,
            type: 'takeoff',
            position: { x: 0, y: 0, z: 0 },
            action: 'Takeoff and climb to altitude',
            timestamp: 0
        });
        
        let currentTime = UAV_CONFIG.setupTime;
        
        // Add waypoints for each path
        paths.forEach((path, index) => {
            // Start of pass
            waypoints.push({
                id: waypointId++,
                type: 'pass_start',
                position: { ...path.startPosition, z: UAV_CONFIG.altitude },
                action: `Start Pass ${path.passNumber} - ${path.direction}`,
                timestamp: currentTime
            });
            
            // Calculate time for this pass
            const distance = Math.abs(path.endPosition.x - path.startPosition.x);
            const passTime = distance / UAV_CONFIG.speed;
            currentTime += passTime;
            
            // End of pass
            waypoints.push({
                id: waypointId++,
                type: 'pass_end',
                position: { ...path.endPosition, z: UAV_CONFIG.altitude },
                action: `End Pass ${path.passNumber}`,
                timestamp: currentTime
            });
            
            // Turn time (if not last pass)
            if (index < paths.length - 1) {
                currentTime += 5; // 5 seconds for turn
            }
        });
        
        // Landing
        waypoints.push({
            id: waypointId++,
            type: 'landing',
            position: { x: 0, y: 0, z: 0 },
            action: 'Return to home and land',
            timestamp: currentTime + UAV_CONFIG.landingTime
        });
        
        return waypoints;
    }
    
    /**
     * Calculate total images to be captured
     */
    static calculateImageCount(totalFlightTime) {
        return Math.floor(totalFlightTime / UAV_CONFIG.imageInterval);
    }
    
    /**
     * Calculate total flight distance
     */
    static calculateTotalDistance(paths) {
        let totalDistance = 0;
        paths.forEach(path => {
            const dx = path.endPosition.x - path.startPosition.x;
            const dy = path.endPosition.y - path.startPosition.y;
            totalDistance += Math.sqrt(dx * dx + dy * dy);
        });
        return totalDistance;
    }
}

// ===== FLIGHT DATA GENERATOR =====
class FlightDataGenerator {
    
    /**
     * Generate complete flight plan
     */
    static generateFlightPlan(farmerId, fieldId) {
        const paths = FlightPathCalculator.calculateGridPath(
            UAV_CONFIG.fieldWidth,
            UAV_CONFIG.fieldLength,
            UAV_CONFIG.overlap
        );
        
        const waypoints = FlightPathCalculator.calculateWaypoints(paths);
        const totalDistance = FlightPathCalculator.calculateTotalDistance(paths);
        const totalFlightTime = waypoints[waypoints.length - 1].timestamp;
        const totalImages = FlightPathCalculator.calculateImageCount(totalFlightTime);
        
        const now = Date.now();
        
        return {
            // Flight identification
            flightId: `UAV_${farmerId}_${Date.now()}`,
            farmerId: farmerId,
            fieldId: fieldId,
            
            // Flight status
            status: 'planned', // 'planned', 'ready', 'flying', 'completed', 'failed'
            
            // Timing
            createdAt: now,
            scheduledStartTime: null, // Set when user schedules
            actualStartTime: null,
            landTime: null,
            
            // Flight parameters
            altitude: UAV_CONFIG.altitude,
            speed: UAV_CONFIG.speed,
            pattern: UAV_CONFIG.pattern,
            
            // Flight path
            paths: paths,
            waypoints: waypoints,
            
            // Statistics
            totalPasses: paths.length,
            totalDistance: Math.round(totalDistance),
            totalFlightTime: Math.round(totalFlightTime), // seconds
            estimatedImages: totalImages,
            
            // Field coverage
            fieldDimensions: {
                width: UAV_CONFIG.fieldWidth,
                length: UAV_CONFIG.fieldLength,
                area: UAV_CONFIG.fieldWidth * UAV_CONFIG.fieldLength
            },
            
            // Image capture
            imageInterval: UAV_CONFIG.imageInterval,
            capturedImages: 0,
            
            // Battery
            batteryStart: 100,
            batteryEnd: null,
            batteryUsageRate: 2, // % per minute
            
            // Weather conditions (simulated)
            weather: {
                temperature: 28, // Celsius
                windSpeed: 5, // km/h
                visibility: 'Good',
                conditions: 'Clear'
            }
        };
    }
    
    /**
     * Update flight status
     */
    static updateFlightStatus(flightData, newStatus) {
        const now = Date.now();
        
        flightData.status = newStatus;
        
        switch (newStatus) {
            case 'ready':
                flightData.scheduledStartTime = now;
                break;
            
            case 'flying':
                flightData.actualStartTime = now;
                flightData.landTime = now + (flightData.totalFlightTime * 1000);
                break;
            
            case 'completed':
                const flightDuration = (now - flightData.actualStartTime) / 1000 / 60; // minutes
                flightData.batteryEnd = Math.max(
                    0,
                    flightData.batteryStart - (flightDuration * flightData.batteryUsageRate)
                );
                flightData.capturedImages = flightData.estimatedImages;
                break;
        }
        
        return flightData;
    }
}

// ===== FLIGHT STORAGE MANAGER =====
class FlightStorageManager {
    
    /**
     * Save flight plan to localStorage
     */
    static saveFlightPlan(flightData) {
        try {
            localStorage.setItem('uav_flight_data', JSON.stringify(flightData));
            
            // Also save to flight history
            this.addToFlightHistory(flightData);
            
            return { success: true, flightId: flightData.flightId };
        } catch (error) {
            console.error('Error saving flight plan:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Get current flight plan
     */
    static getCurrentFlight() {
        try {
            const data = localStorage.getItem('uav_flight_data');
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('Error loading flight plan:', error);
            return null;
        }
    }
    
    /**
     * Add flight to history
     */
    static addToFlightHistory(flightData) {
        try {
            const historyKey = 'uav_flight_history';
            let history = localStorage.getItem(historyKey);
            history = history ? JSON.parse(history) : [];
            
            // Keep only last 10 flights
            if (history.length >= 10) {
                history.shift();
            }
            
            history.push({
                flightId: flightData.flightId,
                farmerId: flightData.farmerId,
                status: flightData.status,
                createdAt: flightData.createdAt,
                totalImages: flightData.capturedImages,
                flightTime: flightData.totalFlightTime
            });
            
            localStorage.setItem(historyKey, JSON.stringify(history));
        } catch (error) {
            console.error('Error saving to history:', error);
        }
    }
    
    /**
     * Get flight history
     */
    static getFlightHistory() {
        try {
            const data = localStorage.getItem('uav_flight_history');
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('Error loading flight history:', error);
            return [];
        }
    }
    
    /**
     * Clear current flight
     */
    static clearCurrentFlight() {
        localStorage.removeItem('uav_flight_data');
    }
    
    /**
     * Update flight progress (for real-time updates)
     */
    static updateFlightProgress(currentWaypointId, capturedImages, batteryLevel) {
        const flightData = this.getCurrentFlight();
        if (!flightData) return null;
        
        flightData.currentWaypoint = currentWaypointId;
        flightData.capturedImages = capturedImages;
        flightData.currentBattery = batteryLevel;
        
        this.saveFlightPlan(flightData);
        return flightData;
    }
}

// ===== FLIGHT SIMULATOR =====
class FlightSimulator {
    
    /**
     * Simulate flight execution
     */
    static startFlightSimulation(flightData) {
        // Update status to flying
        flightData = FlightDataGenerator.updateFlightStatus(flightData, 'flying');
        FlightStorageManager.saveFlightPlan(flightData);
        
        // Set timeout to mark as completed
        const flightDuration = flightData.totalFlightTime * 1000; // Convert to ms
        
        setTimeout(() => {
            const currentFlight = FlightStorageManager.getCurrentFlight();
            if (currentFlight && currentFlight.flightId === flightData.flightId) {
                const completedFlight = FlightDataGenerator.updateFlightStatus(
                    currentFlight,
                    'completed'
                );
                FlightStorageManager.saveFlightPlan(completedFlight);
                
                // Trigger completion event
                window.dispatchEvent(new CustomEvent('uavFlightCompleted', {
                    detail: completedFlight
                }));
            }
        }, flightDuration);
        
        return flightData;
    }
    
    /**
     * Get current flight progress
     */
    static getFlightProgress(flightData) {
        if (flightData.status !== 'flying') {
            return { progress: 0, currentWaypoint: null };
        }
        
        const now = Date.now();
        const elapsed = (now - flightData.actualStartTime) / 1000; // seconds
        const progress = Math.min(100, (elapsed / flightData.totalFlightTime) * 100);
        
        // Find current waypoint
        const currentWaypoint = flightData.waypoints.find(wp => 
            wp.timestamp <= elapsed && 
            elapsed < (wp.timestamp + 10)
        );
        
        return {
            progress: Math.round(progress),
            currentWaypoint: currentWaypoint,
            elapsedTime: Math.round(elapsed),
            remainingTime: Math.round(flightData.totalFlightTime - elapsed)
        };
    }
}

// ===== EXPORT FOR USE =====
// If using modules, export these classes
// Otherwise, they're available globally

window.UAVFlightManager = {
    config: UAV_CONFIG,
    generateFlightPlan: FlightDataGenerator.generateFlightPlan,
    updateFlightStatus: FlightDataGenerator.updateFlightStatus,
    saveFlightPlan: FlightStorageManager.saveFlightPlan,
    getCurrentFlight: FlightStorageManager.getCurrentFlight,
    getFlightHistory: FlightStorageManager.getFlightHistory,
    clearCurrentFlight: FlightStorageManager.clearCurrentFlight,
    updateFlightProgress: FlightStorageManager.updateFlightProgress,
    startFlightSimulation: FlightSimulator.startFlightSimulation,
    getFlightProgress: FlightSimulator.getFlightProgress
};