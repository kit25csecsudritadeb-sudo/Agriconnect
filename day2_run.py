import os
import cv2
import numpy as np

IMG_SIZE = 224

CLASS_MAP = {
    "healthy": 0,
    "stressed": 1,
    "diseased": 2
}

def preprocess_image(path):
    img = cv2.imread(path)
    if img is None:
        raise ValueError(f"Cannot read image: {path}")

    img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    img = cv2.resize(img, (IMG_SIZE, IMG_SIZE))
    img = img.astype("float32") / 255.0
    return img


def load_field(field_path):
    images = []
    labels = []

    for folder in os.listdir(field_path):
        folder_path = os.path.join(field_path, folder)

        if not os.path.isdir(folder_path):
            continue

        key = folder.lower()
        if key not in CLASS_MAP:
            continue

        label = CLASS_MAP[key]

        for file in os.listdir(folder_path):
            if not file.lower().endswith((".jpg", ".jpeg", ".png", ".JPG")):
                continue

            img_path = os.path.join(folder_path, file)
            img = preprocess_image(img_path)

            images.append(img)
            labels.append(label)

    return np.array(images), np.array(labels)


# -------- DAY 2 EXECUTION --------
FIELD_PATH = "Dataset(kaggle)/field_A"

print("Loading from:", FIELD_PATH)

X, y = load_field(FIELD_PATH)

print("Images shape:", X.shape)
print("Labels shape:", y.shape)
print("Unique labels:", set(y.tolist()))
