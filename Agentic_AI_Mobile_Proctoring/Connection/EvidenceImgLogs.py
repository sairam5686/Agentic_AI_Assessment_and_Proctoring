import os
from dotenv import load_dotenv
import cloudinary
import cloudinary.uploader
import cloudinary.api

load_dotenv()

cloudinary.config(
    cloud_name = os.getenv("CLOUDINARY_MOBILE_CLOUD_NAME"),
    api_key = os.getenv("CLOUDINARY_MOBILE_API_KEY"),
    api_secret = os.getenv("CLOUDINARY_MOBILE_API_SECRET")
)