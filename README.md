AgriConnect

> Precision agriculture powered by UAV imagery and AI — putting insights directly in farmers' hands.

Features

- **Field Zone Mapping** — Divides farmland into monitored zones using drone imagery
- **AI Crop Health Analysis** — Detects diseased, stressed, or anomalous crop areas using OpenCV
- **UAV Anomaly & Sensor Malfunction Detection** — Flags faulty drone sensor readings in real time
- **Flight Manager Interface** — Plan and track UAV missions from a web dashboard
- **Rule-Driven Intelligence** — Automated recommendations without manual expert intervention
- **Farmer-First Design** — No middlemen, clear actionable insights delivered directly

 Tech Stack

| Layer | Technology |
| Backend | Python, Flask |
| Computer Vision | OpenCV, TensorFlow/Keras |
| Frontend | HTML, CSS, Vanilla JavaScript |
| ML Pipeline | Kaggle UAV dataset, custom trained model |
| Preprocessing | NumPy, image segmentation scripts |


 Project Structure


├── agriconnect/          # Core app module
├── backend/              # Flask API routes
├── frontend/             # Web dashboard (HTML/CSS/JS)
├── Mapping/              # Field zone mapping logic
├── Preprocessing/        # Image preprocessing scripts
├── predictions/          # Model output handlers
├── anomaly_detector.py   # UAV sensor anomaly detection
├── train_model.py        # Model training script
├── day2_inference.py     # Inference pipeline
├── generate_predictions.py
└── requirements.txt



Setup & Run

# Clone the repo
git clone https://github.com/kit25csecsudritadeb-sudo/Agriconnect.git
cd Agriconnect

# Install dependencies
pip install -r requirements.txt

# Run the app
python backend/app.py
```

Visit `http://localhost:5000`



Dataset & Model

- Dataset: Kaggle UAV field imagery — not included due to size
- Trained weights: `trained_model.h5` — available on request
- To retrain: `python train_model.py`

 Background

Built to address a real gap in Indian agriculture — affordable, automated crop monitoring
without relying on expensive consultants or middlemen. AgriConnect brings drone-powered
precision farming to small and mid-scale farmers.

Author

**Sudrita Deb** — CSE, Kalaignarkarunanidhi Institute of Technology, Coimbatore
GitHub: [@kit25csecsudritadeb-sudo](https://github.com/kit25csecsudritadeb-sudo)
