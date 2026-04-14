from flask import Blueprint, render_template, redirect, url_for, session
from routes.auth_route import login_required

auth_views = Blueprint('auth_views', __name__)

@auth_views.route('/login')
def login_page():
    return render_template('login.html') 
