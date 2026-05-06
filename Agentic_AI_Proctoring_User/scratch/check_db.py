from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv()
MONGO_URI = os.getenv("MONGODB_URI_ASSESSMENT")
print(f"MONGO_URI: {MONGO_URI}")

if not MONGO_URI:
    print("Error: MONGODB_URI_ASSESSMENT not found in .env")
else:
    try:
        client = MongoClient(MONGO_URI)
        db = client["CandidateDB"]
        collection = db["essay_results"]

        count = collection.count_documents({})
        print(f"Total documents in essay_results: {count}")
        
        if count > 0:
            for doc in collection.find().limit(5):
                print(doc)
        else:
            print("The collection is empty.")
            
        # Check other collections to see if we are in the right DB
        print(f"Collections in CandidateDB: {db.list_collection_names()}")
        
    except Exception as e:
        print(f"Connection error: {e}")
