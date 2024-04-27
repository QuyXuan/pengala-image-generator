from flask import Flask
from flask_cors import CORS


def create_app():
    app = Flask(__name__)
    CORS(app, resources={r"/*": {"origins": "*"}})
    app.config["SECRET_KEY"] = "secret-key"

    from .views import views

    app.register_blueprint(views, url_prefix="/")

    return app
