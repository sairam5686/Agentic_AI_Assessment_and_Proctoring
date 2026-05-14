# Agentic AI Assessment and Proctoring

hello hiii

tested admin essay
<p align="center">
  <img src="./Images/Banner_Titans_gitHub.png"  alt="Team Titans Banner" width="100%">
</p>
check
how to run everything 

admin backend
cd Agentic_AI_Proctoring_Admin
python3.12 -m uvicorn  main:app --reload
frontend
cd Agentic_AI_Proctoring_Admin
cd Frontend
npm run dev

> [!IMPORTANT]
> **TEAM NAME: TITANS**
> - **Vimal Raj D** - Proctor Interface (Full Stack)
> - **Sairam JR** - User Interface (Full Stack)
> - **Sridharan S** - Admin Interface (Full Stack)
> - **Sharmi M** - AI Agents (Frontcam & Code Plagiarism)
> - **Vishal R** - AI Agents (Mobile Monitoring)
> - **Mr Ashok M** - College Mentor
>
> **Rajalakshmi Institute of Technology, Chennai**

---

##  About the Project
**Agentic AI Assessment and Proctoring** is an autonomous, multi-agent proctoring system designed to solve the critical "blind spot" problem in remote examinations. By pairing a candidate's mobile phone as a secondary lateral camera, our system achieves total environment visibility. A central **Supervisor Agent** cross-references signals from specialized Vision, Gesture, and Audio agents.

---

##  Tech Stack Used

### **Frontend**
*   **React 19 (Vite):** Core UI framework with TypeScript support.
*   **Tailwind CSS 4:** Modern utility-first styling for glassmorphic design.
*   **Agora RTC/RTM SDKs:** Real-time synchronization and communication.

### **Backend**
*   **FastAPI (Python):** High-performance AI service orchestration.
*   **Uvicorn:** ASGI server for low-latency processing.

### **AI / ML**
*   **YOLOv8 (Ultralytics):** Real-time prohibited object detection.
*   **MediaPipe:** 468-point facial mesh and 33-point pose landmarks.
*   **Natural Language Processing:** For voice and keyword analysis.

### **Database & Tools**
*   **MongoDB:** NoSQL storage for logs and results.
*   **Cloudinary:** Secure evidence image/video storage.
*   **Lucide-React:** Premium iconography for dashboards.

---

## 📂 Project File Structure
```text
Agentic_AI_Assessment_and_Proctoring/
│
├── Agentic_AI_Assessment_Support_Portal/   # Candidate Assessment support portal 
│   ├── Backend/                    # FastAPI Support services
│   └── Frontend/                   # React Support UI
├── Agentic_AI_Mobile_Proctoring/   # Mobile "Third-Eye" Agent Core
├── Agentic_AI_Proctoring_Admin/    # Admin Dashboard (Management)
│   ├── Backend/                    # FastAPI Admin services
│   └── Frontend/                   # React Admin UI
├── Agentic_AI_Proctoring_User/     # Candidate Interface (Exam)
│   ├── Backend/                    # Assessment logic
│   └── Frontend/                   # Monaco Editor & Exam UI
│   └── third_eye/                  # Flutter Mobile app
├── Proctor_interface/              # Real-time Monitoring dashboard
└── video_proctor/                  # Main Webcam AI Processing Hub
```

---

##  How to Run the Project (Step-by-Step)

The project consists of 5 independent modules. Each must be run in its own terminal.

### **1. AI Proctoring Core (Frontcam & Code Analytics)**
**Purpose:** Handles main webcam vision agents and code-level plagiarism analysis.
```bash
cd video_proctor
pip install -r requirements.txt
python -m uvicorn server:app --host 127.0.0.1 --port 8001 --reload
```

### **2. Mobile "Third-Eye" AI Agent**
**Purpose:** Processes the lateral mobile camera stream for environment monitoring.
```bash
cd Agentic_AI_Mobile_Proctoring
pip install -r requirements.txt
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8002
```

### **3. Admin Management Platform**
**Purpose:** Manage assessments, view candidate reports, and analytics.
*   **Run Backend:**
    ```bash
    cd Agentic_AI_Proctoring_Admin
    pip install -r requirements.txt
    python3.12 -m uvicorn main:app --reload
    ```
*   **Run Frontend:**
    ```bash
    cd Agentic_AI_Proctoring_Admin/Frontend
    npm install
    npm run dev
    ```

### **4. Candidate Exam Portal (User Interface)**
**Purpose:** The environment where candidates take the test (Monaco Editor).
*   **Run Backend:**
    ```bash
    cd Agentic_AI_Proctoring_User
    pip install -r requirements.txt
    python -m uvicorn main:sio_app --host 0.0.0.0 --port 8000 --reload
    ```
*   **Run Frontend:**
    ```bash
    cd Agentic_AI_Proctoring_User/Frontend
    npm install
    npm run dev
*   **Run third_eye:**
    ```bash
    cd Agentic_AI_Proctoring_User/third_eye
    flutter pub get
    flutter run
    ```

### **5. Candidate Assessment Support Portal**
**Purpose:** AI-powered support portal for candidate queries and AI-generated PDF integrity reports.
*   **Run Backend:**
    ```bash
    cd Agentic_AI_Assessment_Support_Portal/backend
    pip install -r requirements.txt
    python -m uvicorn main:app --reload --port 8003
    ```
*   **Run Frontend:**
    ```bash
    cd Agentic_AI_Assessment_Support_Portal/frontend
    npm install
    npm run dev
    ```

### **6. Live Proctor Monitoring Interface**
**Purpose:** Real-time dashboard for proctors to monitor candidates.
```bash
cd Proctor_interface/Frontend
npm install --legacy-peer-deps
npm run dev
```

---

##  Components Used (COTS & Open Source)

| Component | Type | Purpose | Link |
| :--- | :--- | :--- | :--- |
| **YOLOv8** | Open Source | Real-time object detection | [Source](https://github.com/ultralytics/ultralytics) |
| **MediaPipe** | Open Source | Face & Pose landmark estimation | [Source](https://github.com/google-ai-edge/mediapipe) |
| **Agora SDK** | COTS | RTC/RTM Communication | [Source](https://www.agora.io/) |
| **Cloudinary** | COTS | Secure evidence hosting | [Source](https://cloudinary.com/) |
| **FastAPI** | Open Source | Backend API Framework | [Source](https://fastapi.tiangolo.com/) |

---

##  Project Screenshots
Create folders `./assets/admin`, `./assets/user`, `./assets/proctor` to store screenshots.

### **Admin Flow**

<div>
<img src="./Images/Images_admin_interface/Admin_img_1.jpeg" width="250" height="450"/>
<img src="./Images/Images_admin_interface/Admin_img_2.jpeg" width="250" height="450"/>
<img src="./Images/Images_admin_interface/Admin_img_3.jpeg" width="250" height="450"/>
<img src="./Images/Images_admin_interface/Admin_img_4.jpeg" width="250" height="450"/>
<img src="./Images/Images_admin_interface/Admin_img_5.jpeg" width="250" height="450"/>
<img src="./Images/Images_admin_interface/Admin_img_6.jpeg" width="250" height="450"/>
<img src="./Images/Images_admin_interface/Admin_img_7.jpeg" width="250" height="450"/>
<img src="./Images/Images_admin_interface/Admin_img_8.jpeg" width="250" height="450"/>
<img src="./Images/Images_admin_interface/Admin_img_9.jpeg" width="250" height="450"/>
<img src="./Images/Images_admin_interface/Admin_img_10.jpeg" width="250" height="450"/>
<img src="./Images/Images_admin_interface/Admin_img_11.jpeg" width="250" height="450"/>
<img src="./Images/Images_admin_interface/Admin_img_12.jpeg" width="250" height="450"/>
<img src="./Images/Images_admin_interface/Admin_img_13.jpeg" width="250" height="450"/>
<img src="./Images/Images_admin_interface/Admin_img_14.jpeg" width="250" height="450"/>
<img src="./Images/Images_admin_interface/Admin_img_16.jpeg" width="250" height="450"/>
<img src="./Images/Images_admin_interface/Admin_img_17.jpeg" width="250" height="450"/>
<img src="./Images/Images_admin_interface/Admin_img_18.jpeg" width="250" height="450"/>
<img src="./Images/Images_admin_interface/Admin_img_19.jpeg" width="250" height="450"/>
<img src="./Images/Images_admin_interface/Admin_img_20.jpeg" width="250" height="450"/>
<img src="./Images/Images_admin_interface/Admin_img_21.jpeg" width="250" height="450"/>
<img src="./Images/Images_admin_interface/Admin_img_22.jpeg" width="250" height="450"/>
<img src="./Images/Images_admin_interface/Admin_img_23.jpeg" width="250" height="450"/>
<img src="./Images/Images_admin_interface/Admin_img_24.jpeg" width="250" height="450"/>
<img src="./Images/Images_admin_interface/Admin_img_25.jpeg" width="250" height="450"/>
<img src="./Images/Images_admin_interface/Admin_img_26.jpeg" width="250" height="450"/>
<img src="./Images/Images_admin_interface/Admin_img_27.jpeg" width="250" height="450"/>
<img src="./Images/Images_admin_interface/Admin_img_28.jpeg" width="250" height="450"/>
<img src="./Images/Images_admin_interface/Admin_img_29.jpeg" width="250" height="450"/>
<img src="./Images/Images_admin_interface/Admin_img_30.jpeg" width="250" height="450"/>
<img src="./Images/Images_admin_interface/Admin_img_31.jpeg" width="250" height="450"/>
<img src="./Images/Images_admin_interface/Admin_img_32.jpeg" width="250" height="450"/>
<img src="./Images/Images_admin_interface/Admin_img_33.jpeg" width="250" height="450"/>
<img src="./Images/Images_admin_interface/Admin_img_34.jpeg" width="250" height="450"/>
<img src="./Images/Images_admin_interface/Admin_img_35.jpeg" width="250" height="450"/>
<img src="./Images/Images_admin_interface/Admin_img_38.jpeg" width="250" height="450"/>
<img src="./Images/Images_admin_interface/Admin_img_39.jpeg" width="250" height="450"/>
</div>

### **Candidate Flow**
<div>

<img src="./Images/Images_candidate_interface/candidate_img_3.jpeg" width="250" height="450"/>
<img src="./Images/Images_candidate_interface/candidate_img_5.jpeg" width="250" height="450"/>
<img src="./Images/Images_candidate_interface/candidate_img_6.jpeg" width="250" height="450"/>
<img src="./Images/Images_candidate_interface/candidate_img_7.jpeg" width="250" height="450"/>
<img src="./Images/Images_candidate_interface/candidate_img_8.jpeg" width="250" height="450"/>
<img src="./Images/Images_candidate_interface/candidate_img_9.jpeg" width="250" height="450"/>
<img src="./Images/Images_candidate_interface/candidate_img_10.jpeg" width="250" height="450"/>
<img src="./Images/Images_candidate_interface/candidate_img_12.jpeg" width="250" height="450"/>
<img src="./Images/Images_candidate_interface/candidate_img_13.jpeg" width="250" height="450"/>
<img src="./Images/Images_candidate_interface/candidate_img_14.jpeg" width="250" height="450"/>
<img src="./Images/Images_candidate_interface/candidate_img_15.jpeg" width="250" height="450"/>
<img src="./Images/Images_candidate_interface/candidate_img_16.jpeg" width="250" height="450"/>
<img src="./Images/Images_candidate_interface/candidate_img_17.jpeg" width="250" height="450"/>
<img src="./Images/Images_candidate_interface/candidate_img_18.jpeg" width="250" height="450"/>
<img src="./Images/Images_candidate_interface/candidate_img_19.jpeg" width="250" height="450"/>
<img src="./Images/Images_candidate_interface/candidate_img_20.jpeg" width="250" height="450"/>
<img src="./Images/Images_candidate_interface/candidate_img_21.jpeg" width="250" height="450"/>
<img src="./Images/Images_candidate_interface/candidate_img_22.jpeg" width="250" height="450"/>
<img src="./Images/Images_candidate_interface/candidate_img_23.jpeg" width="250" height="450"/>
<img src="./Images/Images_candidate_interface/candidate_img_24.jpeg" width="250" height="450"/>

<img src="./Images/Images_candidate_interface/candidate_img_26.jpeg" width="250" height="450"/>

</div>

### **Proctor Flow**
<div>
<img src="./Images/Image_Proctor_interface/Proctor_Img1.jpeg" width="250" height="450"/>
<img src="./Images/Image_Proctor_interface/Proctor_Img2.jpeg" width="250" height="450"/>
<img src="./Images/Image_Proctor_interface/Proctor_Img3.jpeg" width="250" height="450"/>
<img src="./Images/Image_Proctor_interface/Proctor_Img4.jpeg" width="250" height="450"/>
<img src="./Images/Image_Proctor_interface/Proctor_Img5.jpeg" width="250" height="450"/>
<img src="./Images/Image_Proctor_interface/Proctor_Img6.jpeg" width="250" height="450"/>
<img src="./Images/Image_Proctor_interface/Proctor_Img7.jpeg" width="250" height="450"/>
<img src="./Images/Image_Proctor_interface/Proctor_Img8.jpeg" width="250" height="450"/>
<img src="./Images/Image_Proctor_interface/Proctor_Img9.jpeg" width="250" height="450"/>
</div>

### Mobile Interface Flow Images
<div align="center">

<img src="./Images/Images_Mobile_interface/Mobile_img_1.jpeg" width="250" height="450"/>
<img src="./Images/Images_Mobile_interface/Mobile_img_2.jpeg" width="250" height="450"/>
<br/>


<img src="./Images/Images_Mobile_interface/Mobile_img_4.jpeg" width="250" height="450"/>
<img src="./Images/Images_Mobile_interface/Mobile_img_5.jpeg" width="250" height="450"/>
<img src="./Images/Images_Mobile_interface/Mobile_img_6.jpeg" width="250" height="450"/>

</div>

### Candidate Support Interface Flow Images

<div >
<img src="./Images/Image_Support_Interface/Support_img_5.jpeg" width="250" height="450"/>
<img src="./Images/Image_Support_Interface/Support_img_1.jpeg" width="250" height="450"/>
<img src="./Images/Image_Support_Interface/Support_img_2.jpeg" width="250" height="450"/>
<img src="./Images/Image_Support_Interface/Support_img_3.jpeg" width="250" height="450"/>
<img src="./Images/Image_Support_Interface/Support_img_4.jpeg" width="250" height="450"/>

</div>


---

##  Features
*   **360° Surveillance:** Lateral "Third-Eye" mobile camera synchronization.
*   **Agentic Orchestration:** Specialized agents monitored by a central Supervisor Core.
*   **Dynamic Risk Score:** Real-time behavioral analysis with escalation multipliers.
*   **Auto-Audit:** Instant PDF integrity report generation via ReportLab.

---