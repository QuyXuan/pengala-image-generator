from flask import (
    Blueprint,
    render_template,
    request,
    jsonify,
    render_template_string,
    make_response,
)
import base64
import os
import pathlib
import requests
from .firebase_utils import (
    create_user,
    add_image,
    get_list_images,
)
from werkzeug.utils import secure_filename
from datetime import datetime
from google.oauth2 import id_token
from google_auth_oauthlib.flow import Flow
from pip._vendor import cachecontrol
import google.auth.transport.requests

views = Blueprint("views", __name__)

is_normal_mode = False
options_dimensions = [
    "512x512",
    "640x384",
    "768x512",
    "512x768",
    "1024x1024",
    "1024x1536",
    "1536x1024",
    "1280x768",
]

engine_id = "stable-diffusion-v1-6"
api_host = os.getenv("API_HOST")
api_key = os.getenv("STABILITY_API_KEY")
directory = "./website/static/images"
image_imported_path = f"{directory}/images-imported/image-imported.png"

os.environ["OAUTHLIB_INSECURE_TRANSPORT"] = "1"
oauth_client_id = os.getenv("OAUTH_CLIENT_ID")
client_secrets_file = os.path.join(pathlib.Path(__file__).parent, "oauth_config.json")
flow = Flow.from_client_secrets_file(
    client_secrets_file=client_secrets_file,
    scopes=[
        "https://www.googleapis.com/auth/userinfo.profile",
        "https://www.googleapis.com/auth/userinfo.email",
        "openid",
    ],
    redirect_uri="http://localhost:5000/callback",
)
user_email = None


@views.route("/")
def home():
    global user_email
    user_email = request.cookies.get("user_email")
    user_auth = {
        "is_auth": "user_email" in request.cookies,
        "user_avatar": request.cookies.get("user_picture"),
        "user_name": request.cookies.get("user_name"),
    }
    return render_template(
        "index.html",
        user_auth=user_auth,
    )


@views.route("/create")
def create():
    global user_email
    user_email = request.cookies.get("user_email")
    user_auth = {
        "is_auth": "user_email" in request.cookies,
        "user_avatar": request.cookies.get("user_picture"),
        "user_name": request.cookies.get("user_name"),
    }
    list_images = get_list_images(user_email)
    return render_template(
        "create.html",
        user_auth=user_auth,
        options_dimensions=options_dimensions,
        list_images=list_images,
    )


@views.route("/login")
def login():
    authorization_url, state = flow.authorization_url(prompt="select_account")
    return jsonify({"url": authorization_url})


@views.route("/callback")
def callback():
    flow.fetch_token(authorization_response=request.url)

    credentials = flow.credentials
    request_session = requests.session()
    cached_session = cachecontrol.CacheControl(request_session)
    token_request = google.auth.transport.requests.Request(session=cached_session)

    id_info = id_token.verify_oauth2_token(
        id_token=credentials._id_token, request=token_request, audience=oauth_client_id
    )

    create_user(id_info.get("email"))

    response = make_response(
        render_template_string(
            """
    <html>
        <script>
            window.opener.location.reload();
            window.opener.location.href = "/";
            window.close();
        </script>
    </html>
    """
        )
    )
    response.set_cookie("user_email", id_info.get("email"))
    response.set_cookie("user_name", id_info.get("name"))
    response.set_cookie("user_picture", id_info.get("picture"))
    return response


@views.route("/import-image", methods=["POST"])
def import_image():
    if "image" not in request.files:
        return jsonify({"error": "No file part"})
    file = request.files["image"]
    if file.filename == "":
        return jsonify({"error": "No selected file"})
    if file and file.filename:
        file_ext = file.filename.split(".")[-1]
        global image_imported_path
        image_imported_path = f"{directory}/images-imported/image-imported.{file_ext}"
        file.save(os.path.join(image_imported_path))

    return jsonify({"success": "Image imported successfully!"})


@views.route("/text-to-image", methods=["POST"])
def text_to_image():
    text_prompt = request.form.get("text_prompt")
    height = int(request.form.get("height", 0))
    width = int(request.form.get("width", 0))
    response = requests.post(
        f"{api_host}/v1/generation/{engine_id}/text-to-image",
        headers={
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Authorization": f"Bearer {api_key}",
        },
        json={
            "text_prompts": [{"text": text_prompt, "weight": 1}],
            "cfg_scale": 7,
            "height": height,
            "width": width,
            "samples": 1,
            "sampler": "K_DPM_2_ANCESTRAL",
            "steps": 30,
        },
    )

    if response.status_code != 200:
        print(response.json())
        return jsonify({"error": "Server error!"})

    data = response.json()

    if "artifacts" in data and len(data["artifacts"]) > 0:
        image_url = add_image(data["artifacts"][0]["base64"], user_email)

        save_image_to_directory(data)
    else:
        return jsonify(
            {
                "error": "No image generated! Please try again with another text prompt.",
            }
        )

    return jsonify(
        {
            "image_url": image_url,
        }
    )


@views.route("/image-to-image", methods=["POST"])
def image_to_image():
    text_prompt = request.form.get("text_prompt")
    print(image_imported_path)
    response = requests.post(
        f"{api_host}/v1/generation/{engine_id}/image-to-image",
        headers={
            "Accept": "application/json",
            "Authorization": f"Bearer {api_key}",
        },
        files={
            "init_image": open(image_imported_path, "rb"),
        },
        data={
            "image_strength": 0.35,
            "init_image_mode": "IMAGE_STRENGTH",
            "text_prompts[0][text]": text_prompt,
            "cfg_scale": 7,
            "samples": 1,
            "steps": 30,
        },
    )

    if response.status_code != 200:
        print(response.json())
        return jsonify({"error": "Server error!"})

    data = response.json()

    if "artifacts" in data and len(data["artifacts"]) > 0:
        image_url = add_image(data["artifacts"][0]["base64"], user_email)
        save_image_to_directory(data)

    else:
        return jsonify(
            {
                "error": "No image generated! Please try again with another text prompt.",
            }
        )

    return jsonify(
        {
            "image_url": image_url,
        }
    )


def save_image_to_directory(data):
    if not os.path.exists(directory):
        os.makedirs(directory)

    now = datetime.now()
    formatted_date = now.strftime("%Y-%m-%d_%H-%M-%S")

    for i, image in enumerate(data["artifacts"]):
        image_path = os.path.join(
            f"{directory}/images-generated", f"{formatted_date}_{i}.png"
        )
        with open(image_path, "wb") as f:
            f.write(base64.b64decode(image["base64"]))
