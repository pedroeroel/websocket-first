from flask import Flask, Blueprint, render_template
from flask_cors import CORS
from datetime import datetime



main = Blueprint('main', __name__)
CORS(main, resources={r"/*": {"origins": "*"}})

active_chats = {}

@main.route('/')
def index():    
    return render_template('index.html', current_year=f'2025')

