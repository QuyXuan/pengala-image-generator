import firebase_admin
from firebase_admin import credentials, db, storage
from dotenv import load_dotenv
import os
import base64
import uuid
import datetime
import pandas as pd

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


def add_image(transferred_image_base64, raw_image_base64, prompt, user_auth):
    image_transferred_url = upload_image(transferred_image_base64)
    image_raw_url = None
    if raw_image_base64:
        image_raw_url = upload_image(raw_image_base64)

    users_ref = ref.child("users")
    users_snapshot = (
        users_ref.order_by_child("email").equal_to(user_auth["user_email"]).get()
    )

    obj = {
        "prompt": prompt if pd.notnull(prompt) else None,
        "image_transferred_url": image_transferred_url,
        "image_raw_url": image_raw_url,
        "create_time": {".sv": "timestamp"},
        "user_avatar": user_auth["user_avatar"],
        "user_name": user_auth["user_name"],
    }

    if users_snapshot:
        for user_id, user_data in users_snapshot.items():
            images = user_data.get("images", [])
            images.append(obj)
            users_ref.child(user_id).update({"images": images})

    add_image_to_explore(obj)

    return image_transferred_url


def upload_image(base64_image):
    image = base64.b64decode(base64_image)
    blob = bucket.blob(f"images/{uuid.uuid4()}.png")
    blob.upload_from_string(image, content_type="image/png")

    image_url = get_signed_url(blob.name)

    return image_url


def get_signed_url(image_path):
    blob = bucket.blob(image_path)
    signed_url = blob.generate_signed_url(expiration=datetime.datetime(2100, 1, 1))
    return signed_url


def add_image_to_explore(obj):
    explore_ref = ref.child("explore")
    explore_ref.push(obj)


def add_list_image_to_explore():
    explore_ref = ref.child("explore")
    df = pd.read_csv("E:\ImageGeneratorFlask\website\Cleared_image_data_Pixor.csv")

    for index, row in df.iterrows():
        image_transferred_base64 = row["image_transferred_base64"]
        image_raw_base64 = row["image_raw_base64"]
        prompt = row["prompt"]

        image_transferred_url = None
        image_raw_url = None

        if pd.notnull(image_transferred_base64):
            image_transferred_url = upload_image(image_transferred_base64)
        if pd.notnull(image_raw_base64):
            image_raw_url = upload_image(image_raw_base64)

        obj = {
            "prompt": prompt if pd.notnull(prompt) else None,
            "image_transferred_url": image_transferred_url,
            "image_raw_url": image_raw_url,
            "create_time": {".sv": "timestamp"},
            "user_avatar": "https://lh3.googleusercontent.com/a/ACg8ocIHZApLUcTZNTrFuBXg1fl79JMFhMRWxprFdAA6TcrdZbSQCA=s96-c",
            "user_name": "Hung Trinh",
        }
        explore_ref.push(obj)


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
