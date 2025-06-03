from app.app import create_app
from flask_socketio import SocketIO, emit
from datetime import datetime

app, socketio = create_app()

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000, debug=True, allow_unsafe_werkzeug=True)