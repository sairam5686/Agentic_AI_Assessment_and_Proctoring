import os
from dotenv import load_dotenv

load_dotenv()

MONGO_URL = os.getenv("MONGODB_URI", "YOUR_MONGODB_URI")

try:
    client = MongoClient(MONGO_URL)
    db = client['proctoring']
    violation_logs_collection = db['violation_logs']
    Coding_collection = db["Code_Detection_DB"]
    Risk_Score_DB = db["Risk_Score_DB"]
    Mobile_Risk_Score  = db["Mobile_Risk_Score"]
    Mobile_logs_collection = db['Mobile_violation_logs']
except Exception as e:
    print(f"Error connecting to MongoDB: {e}")
    violation_logs_collection = None