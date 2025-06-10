from flask import Flask, Blueprint, session, request
from .routes.main.routes import main
from flask_socketio import SocketIO, emit
from datetime import datetime
from google import genai
from google.genai import types
from dotenv import load_dotenv
from uuid import uuid4
import os
import string

def create_app():

    app = Flask(__name__)

    app.secret_key = 'ee167cd0-781e-4ee2-88ab-d694339a5c07'

    app.register_blueprint(main)
    socketio = SocketIO(app, cors_allowed_origins="*")
    
    @socketio.on('message')
    def chat(msg):
        now = datetime.now().strftime('%d/%m/%Y %H:%M:%S')
        msg['hour'] = now
        print(f"[{now}] {msg['name']}: {msg['message']}")
        emit('message', msg, broadcast=True)

    load_dotenv()
    client = genai.Client(api_key=os.getenv("GENAI_KEY"))

    instructions = """
You are a friendly and helpful virtual assistant specialized in helping users understand and learn any subject the user ask you, being it since school subjects like math or academic questions universities. 
Explain concepts clearly, provide step-by-step solutions, and encourage curiosity. 
If a user asks something that needs too much theory, like a math question, guide them patiently and offer examples when possible. Remember of NOT USING IMAGES,

Always give the user a study guide at the end of your response, with all the themes they need to study to understand the subject better, and for sure, to help him with the ENEM exam.

Ensure that you format markdown to HTML, use this template:

<div class="text-base text-gray-300 mt-0.5 break-words transition-colors flex gap-1 flex-col duration-50">
    message-goes-here
</div>

you are allowed to create margin and padding, or gap tags with tailwind. but only on the response (message-goes-here).

return exercises for practice

speak like a teacher and always respond in the language that the user asks.

NEVER RETURN MARKDOWN SYNTAX, JUST HTML, AND DONT USE ANY MARKDOWN SYNTAX, JUST HTML TAGS.

DONT CHANGE ANY CLASS OR PROPERTY, JUST THE PARAMETERS, YOU CAN ONLY USE TAILWIND CLASSES ON THE RESPONSE.

REPLACE THE MARKDOWN SYNTAX WITH HTML TAGS, FOR EXAMPLE, IF YOU WANT TO SEND:
**Hello, World!**
you should return:
```html
<div class="text-base text-gray-300 mt-0.5 break-words transition-colors flex gap-1 flex-col duration-50">
    <strong>Hello, World!</strong>
</div>
```
"""

    active_chats = {}

    def get_user_chat():
        if 'session_id' not in session:
            session['session_id'] = str(uuid4())
            session_id = session['session_id']

            if session_id not in active_chats:
                try:
                    chat_session = client.chats.create(
                        model="gemini-2.0-flash-lite",
                        config=types.GenerateContentConfig(system_instruction=instructions)
                    )
                    active_chats[session_id] = chat_session
                except Exception as e:
                    app.logger.error(f"Error creating Gemini chat for {session_id}: {e}", exc_info=True)
                    raise

            if session_id in active_chats and active_chats[session_id] is None:
                try:
                    chat_session = client.chats.create(
                        model="gemini-2.0-flash",
                        config=types.GenerateContentConfig(system_instruction=instructions)
                    )
                    active_chats[session_id] = chat_session
                except Exception as e:
                    app.logger.error(f"Error: Chat not Found - Recreating Gemini chat for {session_id}: {e}", exc_info=True)
                    raise
        return active_chats[session['session_id']]

    @socketio.on('send_message')
    def handle_send_message(data):
        """
        Handler for the 'send_message' event emitted by the client.
        'data' should be a dictionary, e.g.: {'message': 'Hello, world!'}
        """
        try:
            user_message = data.get("message")
            if not user_message:
                emit('error', {"error": "Message cannot be empty."})
                return
            print(user_message)
            user_chat = get_user_chat()
            if user_chat is None:
                emit('error', {"error": "Chat session could not be established."})
                return
            gemini_response = user_chat.send_message(user_message)
            # Extract the response text
            response_text = (
                gemini_response.text
                if hasattr(gemini_response, 'text')
                else gemini_response.candidates[0].content.parts[0].text
            )
            # Ensure the response is wrapped in <html> tags if not already
            if not response_text.strip().lower().startswith("```html"):
                response_text = f"{response_text}"
            else:
                # Remove the ```html and ``` markers if present
                response_text = response_text.replace("```html", "").replace("```", "").strip()
            emit('new_message', {
                "sender": "bot",
                "text": response_text,
                "session_id": session.get('session_id')
            })
        except Exception as e:
            app.logger.error(f"Error processing 'send_message' for {session.get('session_id', request.sid)}: {e}", exc_info=True)
            emit('error', {"error": f"Server error: {str(e)}"})


        @socketio.on('disconnect')
        def handle_disconnect():
            print(f"Client disconnected: {request.sid}, session_id: {session.get('session_id', 'N/A')}")

    return app, socketio
