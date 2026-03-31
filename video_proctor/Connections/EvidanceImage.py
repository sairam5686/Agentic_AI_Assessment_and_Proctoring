import cloudinary
import cloudinary.uploader
import cloudinary.api
import os
from dotenv import load_dotenv

load_dotenv()

cloudinary.config(
    cloud_name = os.getenv("CLOUDINARY_CLOUD_NAME", "YOUR_CLOUD_NAME"),
    api_key = os.getenv("CLOUDINARY_API_KEY", "YOUR_API_KEY"),
    api_secret = os.getenv("CLOUDINARY_API_SECRET", "YOUR_API_SECRET")
)