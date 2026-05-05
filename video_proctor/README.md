# AI Video Proctor & Code Analysis System 

An AI-powered proctoring solution that combines real-time video monitoring with automated code analysis to ensure exam integrity.


## 📋 Prerequisites

Before running the server, ensure you have the following installed:

1. **Python 3.10+**
2. **Java JDK** (Required for Java code analysis AST parsing)
3. **Clang / LLVM** (Required for C++ code analysis AST parsing)
4. **PyAudio Dependencies**: 
   - On Windows: `pip install pipwin` then `pipwin install pyaudio`
   - On Linux: `sudo apt-get install python3-pyaudio`

---

## 🚀 How to Start the Server

To launch the FastAPI backend, run the following command in your terminal:

```bash
python -m uvicorn server:app --host 127.0.0.1 --port 8001 --reload
```

- **Host**: `127.0.0.1` (Localhost)
- **Port**: `8001`
- **Reload**: Automatically restarts the server when code changes.

---

## 🏗 Project Architecture

### 📂 Folder Structure

| Folder | Description |
| :--- | :--- |
| `agents/` | Core video proctoring agents (Vision, Audio, Attention, Risk). |
| `code_agents/` | Code analysis specialists (AI detection, Plagiarism, Code Risk). |
| `Connections/` | Database (MongoDB) and Cloudinary (Evidence storage) settings. |
| `models/` | Pre-trained weights for YOLOv8 and Shape Predictors. |
| `outputs/` | Local storage for generated reports (`analytics.json`, `report.pdf`). |
| `tools/` | Specialized utilities (e.g., Java AST tools for code analysis). |

### 📄 Core Files

- **`server.py`**: The FastAPI entry point. Coordinates MJPEG streaming and API endpoints.
- **`main.py`**: The background proctoring loop that runs all video agents concurrently.
- **`state.py`**: Manages shared global state (e.g., current frame, active session status).

---

## 🤖 AI Agents & Technologies

### 👁️ Video Proctoring (Front Camera)

#### **Why YOLO? (You Only Look Once)**
We use **YOLOv8** for real-time object detection. It is extremely fast and accurate, allowing the system to:
- Detect multiple people in the frame.
- Identify "Illegal Objects" like cell phones, books, and laptops.
- **Metric**: If more than one person is detected for >2 seconds, a violation is logged.

#### **Why MediaPipe?**
**MediaPipe** is used for high-fidelity face tracking and landmark detection.
- **Attention Detection**: Monitors eye movement (Gaze), head pose (Yaw/Pitch), and mouth movement.
- **Liveness (Anti-Spoofing)**: Detects blinks and analyzes face texture to prevent users from showing a photo or video of themselves.
- **Metric**: Dropping below an "Attention Score" of 40 or failing to blink for 150 frames triggers a risk warning.

### 💻 Code Analysis

- **`AI Detection Agent`**: Analyzes code fingerprints (naming patterns, docstrings, complexity) to determine if code was AI-generated.
- **`Plagiarism Agent`**: Compares the current submission against previous ones using AST (Abstract Syntax Tree) matching to detect logical copying.

---

## 📊 Analytics & Risk Scoring

The system generates two primary data outputs:

### 1. `analytics.json` (Desktop Proctoring)
- **Input**: Triggered by violations detected during the camera loop.
- **Output**: Contains `desktop_cam_risk_score`, violation counts, and a chronological timeline of suspicious events.
- **Location**: Generated in `agents/report_agent.py`.

### 2. `code_analytics.json` (Code Submission)
- **Input**: Triggered when a candidate submits code to the `/Code/Checker` endpoint.
- **Output**: Contains `code_agents_risk_score`, AI detection probability, and plagiarism results.
- **Location**: Generated in `code_agents/code_supervisor_agent.py`.

### 🛡️ Risk Score vs. Suspicion Score
These are essentially the same. The internal engine calculates a **Suspicion Score** (incrementing by 5 pts per violation), which is then labeled as **Risk Score** in the final JSON for clarity.

---

## 🔧 MongoDB Integration

The system is configured to persist all logs to MongoDB:
- **`violation_logs`**: Each violation includes a timestamp, image URL, and the current `risk_score`.
- **`risk_score`**: Stores final session snapshots.
- **`Code_Detection_DB`**: Stores full code analysis results and AI scores.