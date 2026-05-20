import cv2
import numpy as np
import os

IMG_SIZE = 224

CLASS_MAP = {
    "healthy": 0,
    "stressed": 1,
    "diseased": 2
}

def preprocess_image(image_path):
    img = cv2.imread(image_path)
    if img is None:
        raise ValueError(f"Cannot read image {image_path}")

    img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    img = cv2.resize(img, (IMG_SIZE, IMG_SIZE))
    img = img.astype("float32") / 255.0
    return img


def load_field_images(field_path):
    images = []
    labels = []

    for folder in os.listdir(field_path):
        folder_path = os.path.join(field_path, folder)

        if not os.path.isdir(folder_path):
            continue

        folder_key = folder.lower()   # <-- THIS FIXES Healthy vs healthy

        if folder_key not in CLASS_MAP:
            continue

        label = CLASS_MAP[folder_key]

        for file in os.listdir(folder_path):
            if not file.lower().endswith((".jpg", ".jpeg", ".png")):
                continue

            img_path = os.path.join(folder_path, file)
            img = preprocess_image(img_path)

            images.append(img)
            labels.append(label)

    return np.array(images), np.array(labels)
