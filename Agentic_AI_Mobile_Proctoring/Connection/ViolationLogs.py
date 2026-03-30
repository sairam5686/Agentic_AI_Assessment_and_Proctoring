from pymongo import MongoClient


MONGO_URL= "mongodb+srv://vishravi135_db_user:Virtusa_Hackathon@ai.6axnjyd.mongodb.net/?appName=AI"
try:
    client = MongoClient(MONGO_URL)
    db = client['proctoring']
    
    Risk_Score_Mobile_collection = db['Mobile_Risk_Score']
    violation_logs_Mobile_collection = db['Mobile_violation_logs']
    

except Exception as e:
    print(f"Error connecting to MongoDB: {e}")
    violation_logs_Mobile_collection = None