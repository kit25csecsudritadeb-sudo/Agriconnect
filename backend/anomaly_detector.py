# anomaly_detector.py
import cv2
import numpy as np
from PIL import Image
import io

class UAVAnomalyDetector:
    """
    Detects anomalies in UAV-captured agricultural images using computer vision metrics.
    No deep learning required - uses traditional CV techniques.
    """
    
    # Thresholds calibrated for agricultural imagery
    BLUR_THRESHOLD = 100.0  # Variance of Laplacian
    NOISE_THRESHOLD = 65    # Entropy value
    DARK_THRESHOLD = 50     # Mean brightness
    BRIGHT_THRESHOLD = 200  # Mean brightness
    GREEN_RATIO_MIN = 0.15  # Minimum green channel dominance for vegetation
    
    def __init__(self):
        self.anomalies = []
        self.anomaly_level = "Low"
        self.confidence = 0
    
    def analyze_image(self, image_path):
        """
        Main analysis function - runs all anomaly checks
        Returns: anomaly_analysis dictionary
        """
        try:
            # Load image
            img = cv2.imread(image_path)
            if img is None:
                return self._create_error_response("Image loading failed")
            
            # Reset state
            self.anomalies = []
            self.confidence = 0
            
            # Run all detection checks
            blur_score = self._check_blur(img)
            noise_score = self._check_noise(img)
            exposure_issue = self._check_exposure(img)
            vegetation_present = self._check_vegetation_content(img)
            sensor_issue = self._check_sensor_malfunction(img)
            
            # Determine anomaly level
            self._calculate_anomaly_level()
            
            # Build response
            return self._build_response()
            
        except Exception as e:
            return self._create_error_response(f"Analysis failed: {str(e)}")
    
    def _check_blur(self, img):
        """
        Motion blur detection using Laplacian variance
        Lower variance = more blur
        """
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
        
        if laplacian_var < self.BLUR_THRESHOLD:
            blur_severity = "Severe" if laplacian_var < 50 else "Moderate"
            self.anomalies.append(f"Motion Blur ({blur_severity})")
            self.confidence += 25 if laplacian_var < 50 else 15
        
        return laplacian_var
    
    def _check_noise(self, img):
        """
        Image noise detection using entropy
        Higher entropy in uniform areas = more noise
        """
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        # Calculate entropy (measure of randomness)
        hist = cv2.calcHist([gray], [0], None, [256], [0, 256])
        hist = hist / hist.sum()  # Normalize
        entropy = -np.sum(hist * np.log2(hist + 1e-7))
        
        if entropy > self.NOISE_THRESHOLD:
            self.anomalies.append("Excessive Noise / Compression Artifacts")
            self.confidence += 20
        
        return entropy
    
    def _check_exposure(self, img):
        """
        Exposure problems: overexposed (washed out) or underexposed (too dark)
        """
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        mean_brightness = np.mean(gray)
        
        if mean_brightness < self.DARK_THRESHOLD:
            self.anomalies.append("Underexposed Image")
            self.confidence += 18
            return True
        elif mean_brightness > self.BRIGHT_THRESHOLD:
            self.anomalies.append("Overexposed Image")
            self.confidence += 18
            return True
        
        return False
    
    def _check_vegetation_content(self, img):
        """
        Verify image contains vegetation (crop field)
        Uses green channel dominance and HSV color space
        """
        # Convert to HSV for better vegetation detection
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
        
        # Define green range (vegetation)
        lower_green = np.array([25, 40, 40])
        upper_green = np.array([90, 255, 255])
        
        # Create mask for green areas
        mask = cv2.inRange(hsv, lower_green, upper_green)
        green_ratio = np.count_nonzero(mask) / (img.shape[0] * img.shape[1])
        
        if green_ratio < self.GREEN_RATIO_MIN:
            self.anomalies.append("Non-Crop Content Detected")
            self.confidence += 30  # High confidence issue
            return False
        
        return True
    
    def _check_sensor_malfunction(self, img):
        """
        Camera sensor issues:
        - Dead pixels (stuck at same value)
        - Color channel imbalance
        - Repeated patterns (sensor artifacts)
        """
        # Check for color channel imbalance
        b, g, r = cv2.split(img)
        b_mean, g_mean, r_mean = np.mean(b), np.mean(g), np.mean(r)
        
        # Calculate channel imbalance
        max_mean = max(b_mean, g_mean, r_mean)
        min_mean = min(b_mean, g_mean, r_mean)
        imbalance_ratio = max_mean / (min_mean + 1e-7)
        
        if imbalance_ratio > 2.5:  # One channel dominates excessively
            self.anomalies.append("Camera Sensor Malfunction (Color Shift)")
            self.confidence += 22
            return True
        
        # Check for dead pixel clusters
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        dead_pixels_black = np.count_nonzero(gray == 0)
        dead_pixels_white = np.count_nonzero(gray == 255)
        total_pixels = gray.shape[0] * gray.shape[1]
        
        dead_ratio = (dead_pixels_black + dead_pixels_white) / total_pixels
        
        if dead_ratio > 0.05:  # More than 5% stuck pixels
            self.anomalies.append("Camera Sensor Malfunction (Dead Pixels)")
            self.confidence += 25
            return True
        
        return False
    
    def _calculate_anomaly_level(self):
        """
        Determine severity based on detected anomalies
        """
        if self.confidence >= 50:
            self.anomaly_level = "High"
        elif self.confidence >= 25:
            self.anomaly_level = "Medium"
        else:
            self.anomaly_level = "Low"
        
        # Override: Non-crop content is always High
        if any("Non-Crop Content" in a for a in self.anomalies):
            self.anomaly_level = "High"
    
    def _build_response(self):
        """
        Build standardized response dictionary
        """
        anomaly_detected = len(self.anomalies) > 0
        
        # Generate impact message
        if self.anomaly_level == "High":
            impact = "Crop analysis results are highly unreliable. Immediate UAV inspection required."
        elif self.anomaly_level == "Medium":
            impact = "Crop analysis may contain inaccuracies. Consider re-capture if critical decisions needed."
        else:
            impact = "Minor image quality issues detected. Analysis reliability acceptable."
        
        # Generate recommended actions
        recommended_actions = self._generate_recommendations()
        
        # Officer alert required for High anomalies
        officer_alert = self.anomaly_level == "High"
        
        return {
            "anomaly_detected": anomaly_detected,
            "anomaly_level": self.anomaly_level,
            "anomaly_type": self.anomalies if self.anomalies else ["None"],
            "confidence": min(self.confidence, 100),  # Cap at 100
            "impact": impact,
            "recommended_action": recommended_actions,
            "officer_alert_required": officer_alert
        }
    
    def _generate_recommendations(self):
        """
        Generate specific recommendations based on detected anomalies
        """
        actions = []
        
        for anomaly in self.anomalies:
            if "Motion Blur" in anomaly:
                actions.append("Re-fly UAV at reduced speed (< 5 m/s) for clearer images")
            elif "Noise" in anomaly or "Compression" in anomaly:
                actions.append("Increase image quality settings and reduce compression ratio")
            elif "Underexposed" in anomaly:
                actions.append("Adjust camera exposure compensation (+1 to +2 EV)")
            elif "Overexposed" in anomaly:
                actions.append("Reduce camera exposure or fly during optimal lighting (morning/evening)")
            elif "Non-Crop Content" in anomaly:
                actions.append("Verify flight path and ensure camera angle targets field area only")
            elif "Color Shift" in anomaly:
                actions.append("Recalibrate camera white balance and color settings")
            elif "Dead Pixels" in anomaly:
                actions.append("Service UAV camera sensor - possible hardware failure")
        
        if not actions:
            actions.append("Continue standard UAV operation protocols")
        
        return actions
    
    def _create_error_response(self, error_msg):
        """
        Return safe error response
        """
        return {
            "anomaly_detected": True,
            "anomaly_level": "High",
            "anomaly_type": ["Image Processing Error"],
            "confidence": 0,
            "impact": error_msg,
            "recommended_action": ["Verify image file integrity and re-upload"],
            "officer_alert_required": True
        }


# Integration with existing Flask API
# Add this to your existing farmer endpoint

from anomaly_detector import UAVAnomalyDetector

@app.route('/farmer/<int:farmer_id>', methods=['GET'])
def get_farmer_data(farmer_id):
    # ... your existing code ...
    
    # Get the latest UAV image path for this farmer
    # This assumes you store image paths in your database
    latest_image_path = get_latest_uav_image(farmer_id)  # Your existing function
    
    # Run anomaly detection
    detector = UAVAnomalyDetector()
    anomaly_analysis = detector.analyze_image(latest_image_path)
    
    # Add to existing response
    response_data = {
        # ... all your existing fields ...
        "overall_status": overall_status,
        "most_likely_disease": diseases,
        "percentages": percentages,
        "zone_map": zone_map,
        # ... etc ...
        
        # NEW: Add anomaly analysis
        "anomaly_analysis": anomaly_analysis
    }
    
    return jsonify(response_data)