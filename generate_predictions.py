import os
import json
import cv2
import numpy as np
import tensorflow as tf
import random

# ---------------- CONFIG ----------------
IMG_SIZE = 224
CLASS_NAMES = ["Diseased", "Healthy", "Stressed"]  # must match training order
FIELD_PATH = "Dataset(kaggle)/field_B"
OUTPUT_PATH = "predictions/field_B.json"
# ---------------------------------------

os.makedirs("predictions", exist_ok=True)

def preprocess_image(path):
    img = cv2.imread(path)
    if img is None:
        return None
    img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    img = cv2.resize(img, (IMG_SIZE, IMG_SIZE))
    img = img.astype("float32") / 255.0
    return img

# ---------------- Load Trained Model ----------------
model = tf.keras.models.load_model("trained_model.h5")
print("✅ Trained model loaded successfully")

# ---------------- Storage ----------------
all_predictions = []
samples = []

summary = {
    "Healthy": 0,
    "Stressed": 0,
    "Diseased": 0
}

# ---------------- Inference ----------------
for folder in os.listdir(FIELD_PATH):
    folder_path = os.path.join(FIELD_PATH, folder)
    if not os.path.isdir(folder_path):
        continue

    for file in sorted(os.listdir(folder_path)):
        if not file.lower().endswith((".jpg", ".jpeg", ".png")):
            continue

        img_path = os.path.join(folder_path, file)
        img = preprocess_image(img_path)
        if img is None:
            continue

        img = np.expand_dims(img, axis=0)

        preds = model.predict(img, verbose=0)[0]
        class_index = int(np.argmax(preds))
        class_name = CLASS_NAMES[class_index]
        confidence = float(preds[class_index])

        summary[class_name] += 1

        entry = {
            "image": file,
            "prediction": class_name,
            "confidence": round(confidence, 2)
        }

        all_predictions.append(entry)

        if len(samples) < 10:
            samples.append(entry)
            
        random.shuffle(all_predictions)


# ---------------- Final Output ----------------
output = {
    "field_id": "field_B",
    "farmer_id": "Farmer_2",

    "total_images": len(all_predictions),
    "summary": summary,

    "all_predictions": all_predictions,
    "samples": samples
}

with open(OUTPUT_PATH, "w") as f:
    json.dump(output, f, indent=4)

print("✅ Predictions saved to", OUTPUT_PATH)
