# Assessment Support Portal

An AI-powered support portal that allows candidates to submit queries regarding their assessment results or violations and receive an AI-generated PDF report.


## 🛠️ Project Structure

- **Backend**: FastAPI (Python) with LangChain & Gemini AI.
- **Frontend**: React (TypeScript) with Vite.


## 🚀 Running the Project

### 1. Backend Setup
1.  Navigate to the `backend` folder:
    cd backend

2.  Install dependencies:
    
    pip install -r requirements.txt

3.  Start the server:
    
    & "C:\Python\Python312\python.exe" -m uvicorn main:app --reload --port 8003
    - The API will be available at `http://localhost:8003`.

### 2. Frontend Setup
1.  Navigate to the `frontend` folder:
   
    cd frontend

2.  Install dependencies:
    
    npm install
    
3.  Start the development server:
    
    npm run dev
    - The portal will be available at `http://localhost:5174`.



- **STARTTLS (Start Transport Layer Security)**:
  - This is a command that tells an email server to upgrade an insecure connection (plain text) to a secure one using SSL or TLS. 
  - We use this with **Port 587**.

- **SSL / TLS (Secure Sockets Layer / Transport Layer Security)**:
  - **SSL** was the original standard for encrypting connections.
  - **TLS** is the newer, more secure version that has replaced SSL.
  - In our setup, we keep `MAIL_SSL_TLS=False` because we use Port 587 (STARTTLS), rather than Port 465 (Direct SSL).


