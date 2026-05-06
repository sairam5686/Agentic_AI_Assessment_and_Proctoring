from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv()
MONGO_URI = os.getenv("MONGODB_URI_ASSESSMENT")

client = MongoClient(MONGO_URI)
db = client["CandidateDB"]
collection = db["essay_results"]

# Find documents with the old field names
cursor = collection.find({"candidate_id": {"$exists": True}})
updated_count = 0

for doc in cursor:
    new_doc = {
        "email": doc["candidate_id"],
        "assessment_id": doc["exam_id"],
        "user_name": "Sridharan S", # Hardcoded for now as I saw it in MCQ_Results
        "topic": doc["topic"],
        "essay_text": doc["essay_text"],
        "rubric_used": doc["rubric_used"],
        "evaluation": doc["evaluation"],
        "submitted_at": doc["submitted_at"]
    }
    
    # Delete old doc and insert new one (or just update and unset)
    collection.replace_one({"_id": doc["_id"]}, new_doc)
    updated_count += 1

print(f"Updated {updated_count} documents in essay_results.")
