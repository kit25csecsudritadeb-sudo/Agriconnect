from flask_cors import CORS
from flask import Flask, jsonify
from flask import send_from_directory
import json
import os
import math

app = Flask(__name__)

CORS(app)

# ---------------- Farmer ↔ Field Mapping ----------------

FIELD_MAP = {
    "Farmer_1": "field_A",
    "Farmer_2": "field_B",
    "Farmer_3": "field_C"
}

# ---------------- Farmer ↔ Phone Mapping ----------------

FARMER_PHONE_MAP = {
    "9876543210": "Farmer_1",
    "9123456789": "Farmer_2",
    "9012345678": "Farmer_3"
}

# ---------------- Farmer Name Mapping ----------------

FARMER_NAMES = {
    "Farmer_1": "Rajesh Kumar",
    "Farmer_2": "Priya Sharma",
    "Farmer_3": "Amit Patel"
}

# ---------------- Decision & Disease Rules ----------------

ISSUE_RULES = {
    "Healthy": {
        "risk": "Low",
        "issue": "No visible disease symptoms detected",
        "recommendations": [
            "Continue current irrigation practices",
            "Maintain routine crop monitoring"
        ]
    },
    "Stressed": {
        "risk": "Medium",
        "issue": "Environmental or fungal stress detected in parts of the field",
        "recommendations": [
            "Improve soil nutrition",
            "Balance irrigation levels",
            "Apply organic fertilizer",
            "Improve air circulation"
        ]
    },
    "Diseased": {
        "risk": "High",
        "issue": "Severe disease symptoms detected in affected zones",
        "recommendations": [
            "Isolate affected crop zones",
            "Remove severely infected leaves",
            "Apply recommended fungicide",
            "Consult a local agricultural expert"
        ]
    }
}

DISEASE_MAP = {
    "Healthy": {
        "likely_diseases": [],
        "note": "No disease indicators detected"
    },
    "Stressed": {
        "likely_diseases": ["Leaf Mold"],
        "note": "Stress-related fungal patterns detected"
    },
    "Diseased": {
        "likely_diseases": ["Early Blight", "Late Blight"],
        "note": "Disease patterns consistent with blight detected"
    }
}

# ---------------- Helper Functions ----------------

def create_error_response(message, error_type, status_code):
    """Standardized error response format"""
    return jsonify({
        "error": message,
        "error_type": error_type,
        "success": False
    }), status_code

def calculate_percentages(summary, total):
    return {
        k: round((v / total) * 100, 2) if total > 0 else 0
        for k, v in summary.items()
    }

def determine_overall_status(percentages):
    if percentages.get("Diseased", 0) > 30:
        return "High Risk"
    elif percentages.get("Stressed", 0) > 30:
        return "Moderate Risk"
    else:
        return "Low Risk"

def calculate_severity_index(percentages):
    return round(
        (0.6 * percentages.get("Diseased", 0)) +
        (0.3 * percentages.get("Stressed", 0)) +
        (0.1 * percentages.get("Healthy", 0)),
        2
    )

def generate_zone_map(predictions, zones=5):
    if not predictions:
        return []

    chunk_size = math.ceil(len(predictions) / zones)
    zone_map = []

    for i in range(0, len(predictions), chunk_size):
        chunk = predictions[i:i + chunk_size]
        counts = {}

        for item in chunk:
            cls = item["prediction"]
            counts[cls] = counts.get(cls, 0) + 1

        dominant = max(counts, key=counts.get)

        zone_map.append({
            "zone": len(zone_map) + 1,
            "status": dominant,
            "risk": ISSUE_RULES[dominant]["risk"]
        })

    return zone_map

def identify_priority_zones(zone_map):
    return [
        zone["zone"]
        for zone in zone_map
        if zone["risk"] in ["High", "Medium"]
    ]

def generate_zone_forecast(zone_map):
    forecast = []

    for zone in zone_map:
        status = zone["status"]

        if status == "Diseased":
            forecast.append({
                "zone": zone["zone"],
                "current_status": "Diseased",
                "what_if_no_action": (
                    "If no corrective action is taken, fungal infection may spread "
                    "to adjacent healthy zones within the next 3–4 days."
                ),
                "risk_escalation": "Very High",
                "recommended_action": "Immediate disease containment required."
            })

        elif status == "Stressed":
            forecast.append({
                "zone": zone["zone"],
                "current_status": "Stressed",
                "what_if_no_action": (
                    "If stress conditions persist, this zone is likely to develop "
                    "active disease within the next 5–7 days."
                ),
                "risk_escalation": "Medium to High",
                "recommended_action": "Apply preventive measures to avoid disease onset."
            })

        else:
            forecast.append({
                "zone": zone["zone"],
                "current_status": "Healthy",
                "what_if_no_action": (
                    "Zone is currently stable, but requires monitoring if nearby "
                    "zones remain infected."
                ),
                "risk_escalation": "Low",
                "recommended_action": "Maintain current practices and monitor regularly."
            })

    return forecast

def generate_farmer_insight(overall_status, priority_zones, zone_forecast):
    if overall_status == "High Risk":
        return (
            f"Your field is at high risk. Disease is active in zones {priority_zones}. "
            "Immediate action is required to prevent rapid spread in the next few days."
        )
    elif overall_status == "Moderate Risk":
        return (
            f"Your field shows moderate risk. Stress is detected in zones {priority_zones}. "
            "Timely preventive measures can stop disease development within a week."
        )
    else:
        return (
            "Your field is currently stable with low risk. "
            "Continue regular monitoring to maintain crop health."
        )

# ---------------- SMS Report Generator ----------------

def generate_sms_report(phone_number, overall_status, priority_zones):
    if overall_status == "High Risk":
        message = (
            f"ALERT: Crop disease detected. Zones {priority_zones} affected. "
            "Act immediately to prevent spread in 3–4 days."
        )
    elif overall_status == "Moderate Risk":
        message = (
            f"WARNING: Crop stress in zones {priority_zones}. "
            "Take preventive action within 5–7 days."
        )
    else:
        message = "STATUS: Field healthy. Continue regular monitoring."

    return {
        "to": phone_number,
        "message": message,
        "delivery": "Simulated SMS (no real gateway used)"
    }


# ---------------- Pest Detection & Severity Analysis ----------------

def pest_analysis(percentages, priority_zones):
    severity_score = round(
        (percentages["Diseased"] * 0.6) +
        (percentages["Stressed"] * 0.3) +
        (len(priority_zones) * 2), 2
    )

    if severity_score > 60:
        level = "Severe"
        priority = "Urgent"
    elif severity_score > 30:
        level = "Moderate"
        priority = "Attention Required"
    else:
        level = "Low"
        priority = "Monitor"

    return {
        "pest_type": "Fungal infestation",
        "severity_score": severity_score,
        "severity_level": level,
        "priority_tag": priority,
        "affected_zones": priority_zones,
        "note": "Rule-based inference using disease distribution patterns"
    }

# ---------------- Nutrient Deficiency Analysis ----------------

def nutrient_deficiency_analysis(percentages):
    vegetation_proxy_index = round(
        (percentages["Healthy"] * 1.0 +
         percentages["Stressed"] * 0.6 +
         percentages["Diseased"] * 0.3) / 100, 2
    )

    deficiency_score = round((1 - vegetation_proxy_index) * 100, 2)

    if deficiency_score > 70:
        level = "Critical"
    elif deficiency_score > 50:
        level = "Severe"
    elif deficiency_score > 30:
        level = "Moderate"
    else:
        level = "Mild"

    return {
        "vegetation_index_proxy": vegetation_proxy_index,
        "deficiency_score": deficiency_score,
        "severity_level": level,
        "likely_nutrients": ["Nitrogen", "Potassium"] if level != "Mild" else [],
        "note": "Decision-support estimate based on visual crop stress"
    }

# ---------------- Yield Prediction (Decision Support) ----------------

def yield_prediction_engine(severity_index, pest_score):
    impact_factor = round((severity_index + pest_score) / 4, 2)

    return {
        "baseline_yield": "Expected",
        "predicted_yield_impact": f"-{impact_factor}%",
        "risk_level": "High" if impact_factor > 20 else "Moderate",
        "confidence": "Medium",
        "note": "Decision-support estimate, not a guaranteed yield prediction"
    }

# ======================== ROUTES ==========================

@app.route("/")
def home():
    return jsonify({
        "status": "Precision Agriculture Backend Running",
        "version": "2.0",
        "endpoints": {
            "login": "/farmer/phone/<phone_number>",
            "farmer_data": "/farmer/<farmer_id>",
            "all_fields": "/api/fields"
        }
    })

# ---------------- UPDATED LOGIN ROUTE (Lightweight) ----------------

@app.route("/farmer/phone/<phone_number>")
def get_farmer_by_phone(phone_number):
    """
    Lightweight login endpoint - returns only farmer identification.
    Full data should be fetched separately via /farmer/<farmer_id>
    """
    farmer_id = FARMER_PHONE_MAP.get(phone_number)

    if not farmer_id:
        return create_error_response(
            "Phone number not registered",
            "invalid_phone",
            404
        )

    # Check if farmer has valid field data (basic validation)
    field = FIELD_MAP.get(farmer_id)
    if not field:
        return create_error_response(
            "Farmer profile incomplete",
            "invalid_farmer",
            404
        )

    # Return minimal login response
    return jsonify({
        "success": True,
        "farmer_id": farmer_id,
        "phone_number": phone_number,
        "name": FARMER_NAMES.get(farmer_id, farmer_id.replace("_", " ")),
        "farmer_name": FARMER_NAMES.get(farmer_id, farmer_id.replace("_", " ")),  # Alias for compatibility
        "field_id": field
    }), 200

# ---------------- UPDATED FARMER DATA ROUTE (Enhanced Error Handling) ----------------

@app.route("/farmer/<farmer_id>")
def get_farmer_data(farmer_id):
    field = FIELD_MAP.get(farmer_id)

    if not field:
        return create_error_response(
            "Farmer not found",
            "invalid_farmer",
            404
        )

    file_path = f"predictions/{field}.json"

    if not os.path.exists(file_path):
        return create_error_response(
            "Prediction data not available",
            "missing_data",
            500
        )

    try:
        with open(file_path) as f:
            data = json.load(f)
    except json.JSONDecodeError:
        return create_error_response(
            "Corrupted prediction data",
            "data_error",
            500
        )
    except Exception as e:
        return create_error_response(
            f"Server error: {str(e)}",
            "server_error",
            500
        )

    summary = data.get("summary", {})
    total_images = data.get("total_images", 0)
    predictions = data.get("all_predictions", [])

    percentages = calculate_percentages(summary, total_images)
    overall_status = determine_overall_status(percentages)
    severity_index = calculate_severity_index(percentages)

    dominant_class = max(summary, key=summary.get) if summary else "Healthy"
    issue_info = ISSUE_RULES[dominant_class]
    disease_info = DISEASE_MAP[dominant_class]

    zone_map = generate_zone_map(predictions)
    priority_zones = identify_priority_zones(zone_map)
    zone_forecast = generate_zone_forecast(zone_map)

    farmer_insight = generate_farmer_insight(
        overall_status, priority_zones, zone_forecast
    )

    # ---------- NEW ANALYTICS ----------
    pest_info = pest_analysis(percentages, priority_zones)
    nutrient_info = nutrient_deficiency_analysis(percentages)
    yield_info = yield_prediction_engine(severity_index, pest_info["severity_score"])

    response = {
        "field_id": field,
        "farmer_id": farmer_id,

        "farmer_insight_summary": farmer_insight,

        "overall_status": overall_status,
        "risk_level": issue_info["risk"],
        "severity_index": severity_index,

        "detected_issue": issue_info["issue"],
        "most_likely_disease": disease_info["likely_diseases"],
        "disease_inference_note": disease_info["note"],

        "recommendations": issue_info["recommendations"],

        "summary": summary,
        "percentages": percentages,

        "zone_map": zone_map,
        "priority_zones": priority_zones,
        "what_if_zone_forecast": zone_forecast,

        # ---------- NEW SECTIONS ----------
        "pest_detection_analysis": pest_info,
        "nutrient_deficiency_analysis": nutrient_info,
        "yield_prediction": yield_info,

        "what_if_assumption": (
            "All advanced analytics are rule-based decision-support simulations "
            "and do not represent guaranteed outcomes."
        )
    }

    return jsonify(response)

# ---------------- OFFICER DASHBOARD ROUTE (Enhanced Error Handling) ----------------

@app.route("/api/fields")
def get_all_fields():
    all_fields = []

    for farmer_id, field in FIELD_MAP.items():
        file_path = f"predictions/{field}.json"

        if not os.path.exists(file_path):
            # Skip missing files but log warning
            print(f"Warning: Missing prediction file for {field}")
            continue

        try:
            with open(file_path) as f:
                data = json.load(f)
        except (json.JSONDecodeError, Exception) as e:
            print(f"Error reading {file_path}: {str(e)}")
            continue

        summary = data.get("summary", {})
        total_images = data.get("total_images", 0)

        percentages = calculate_percentages(summary, total_images)
        overall_status = determine_overall_status(percentages)
        severity_index = calculate_severity_index(percentages)

        dominant_class = max(summary, key=summary.get) if summary else "Healthy"
        issue_info = ISSUE_RULES[dominant_class]

        all_fields.append({
            "field_id": field,
            "farmer_id": farmer_id,
            "overall_status": overall_status,
            "risk_level": issue_info["risk"],
            "severity_index": severity_index,
            "dominant_condition": dominant_class,
            "percentages": percentages
        })

    if not all_fields:
        return create_error_response(
            "No field data available",
            "no_data",
            500
        )

    return jsonify(all_fields)

# ---------------- UI SERVING (Optional) ----------------

@app.route("/ui/<path:filename>")
def serve_ui(filename):
    return send_from_directory("../frontend", filename)

# ---------------- Run App ----------------

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)