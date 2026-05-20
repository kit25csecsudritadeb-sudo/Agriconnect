import os
import cv2
import numpy as np
import tensorflow as tf
from tensorflow.keras.applications import EfficientNetB0

# ---------------- CONFIG ----------------
IMG_SIZE = 224
CLASS_NAMES = ["Healthy", "Stressed", "Diseased"]
FIELD_PATH = "Dataset(kaggle)/field_A"
# ----------------------------------------


def preprocess_image(path):
    img = cv2.imread(path)
    if img is None:
        raise ValueError(f"Cannot read image: {path}")

    img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    img = cv2.resize(img, (IMG_SIZE, IMG_SIZE))
    img = img.astype("float32") / 255.0
    return img


def load_field_images(field_path):
    images = []

    for folder in os.listdir(field_path):
        folder_path = os.path.join(field_path, folder)
        if not os.path.isdir(folder_path):
            continue

        for file in os.listdir(folder_path):
            if not file.lower().endswith((".jpg", ".jpeg", ".png")):
                continue

            img_path = os.path.join(folder_path, file)
            images.append(preprocess_image(img_path))

    return np.array(images)


# -------- LOAD DATA --------
print("Loading images from:", FIELD_PATH)
X = load_field_images(FIELD_PATH)
print("Total images:", X.shape[0])

# -------- LOAD MODEL --------
base_model = EfficientNetB0(
    weights="imagenet",
    include_top=False,
    input_shape=(224, 224, 3)
)
base_model.trainable = False

model = tf.keras.Sequential([
    base_model,
    tf.keras.layers.GlobalAveragePooling2D(),
    tf.keras.layers.Dense(3, activation="softmax")
])

# -------- INFERENCE --------
preds = model.predict(X[:10])

print("\nSample Predictions:")
for i, p in enumerate(preds):
    cls = CLASS_NAMES[np.argmax(p)]
    conf = float(np.max(p))
    print(f"Image {i+1}: {cls} (confidence={conf:.2f})")
