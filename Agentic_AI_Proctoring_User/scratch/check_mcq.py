from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv()
MONGO_URI = os.getenv("MONGODB_URI_ASSESSMENT")

client = MongoClient(MONGO_URI)
db = client["CandidateDB"]
collection = db["MCQ_Results"]

print(f"Total documents in MCQ_Results: {collection.count_documents({})}")
for doc in collection.find().limit(1):
    print(doc)
