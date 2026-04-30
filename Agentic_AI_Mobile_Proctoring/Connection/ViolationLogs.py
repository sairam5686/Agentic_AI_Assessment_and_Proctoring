from pymongo import MongoClient


import os
from dotenv import load_dotenv
load_dotenv()
MONGO_URL = os.getenv("MONGODB_URI_PROCTORING")
try:
    client = MongoClient(MONGO_URL)
    db = client['proctoring']
    
    Risk_Score_Mobile_collection = db['Mobile_Risk_Score']
    violation_logs_Mobile_collection = db['Mobile_violation_logs']
    

except Exception as e:
    print(f"Error connecting to MongoDB: {e}")
    violation_logs_Mobile_collection = None