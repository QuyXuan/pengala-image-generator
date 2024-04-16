from flask import Blueprint

auth = Blueprint('auth', __name__)

@auth.route('/login')
def login():
  return 'Login page'

@auth.route('/sign-up')
def sign_up():
  return 'Sign Up page'