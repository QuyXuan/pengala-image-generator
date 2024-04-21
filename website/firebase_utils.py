import firebase_admin
from firebase_admin import credentials, db, storage
from dotenv import load_dotenv
import os
import base64
import uuid
import datetime

load_dotenv()

credentials_file_path = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "credentials.json"
)

database_url = os.environ.get("FIREBASE_DATABASE_URL")
storage_bucket = os.environ.get("FIREBASE_STORAGE_BUCKET")

cred = credentials.Certificate(credentials_file_path)
firebase_admin.initialize_app(
    cred,
    {
        "databaseURL": database_url,
        "storageBucket": storage_bucket,
    },
)

ref = db.reference("/")
bucket = storage.bucket()


def create_user(email):
    users_ref = ref.child("users")
    users_snapshot = users_ref.order_by_child("email").equal_to(email).get()
    if not users_snapshot:
        ref.child("users").push({"email": email})


def add_image(base64_image, email):
    image = base64.b64decode(base64_image)
    blob = bucket.blob(f"images/{uuid.uuid4()}.png")
    blob.upload_from_string(image, content_type="image/png")

    image_url = get_signed_url(blob.name)

    users_ref = ref.child("users")
    users_snapshot = users_ref.order_by_child("email").equal_to(email).get()

    if users_snapshot:
        for user_id, user_data in users_snapshot.items():
            images = user_data.get("images", [])
            images.append(image_url)
            users_ref.child(user_id).update({"images": images})

    return image_url


def get_signed_url(image_path):
    blob = bucket.blob(image_path)
    signed_url = blob.generate_signed_url(expiration=datetime.datetime(2100, 1, 1))
    return signed_url


def get_list_images(email):
    if email is None:
        return []
    users_ref = ref.child("users")
    users_snapshot = users_ref.order_by_child("email").equal_to(email).get()

    if users_snapshot:
        for user_id, user_data in users_snapshot.items():
            images = user_data.get("images", [])
            return list(reversed(images))
    return []
