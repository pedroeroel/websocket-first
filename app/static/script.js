let socket = null;
const chat_box = document.getElementById('chat-box');
const message_input = document.getElementById('message-input');
const send_button = document.getElementById('send-button');
const connection_status = document.getElementById('connection-status');
const start_button = document.getElementById('start-button');
const end_button = document.getElementById('end-button');
let session_id = null;

function addMessageToChat(sender, text, type = 'normal') {
    const message_element = document.createElement('div');
    message_element.classList.add(
        'flex', 'items-start', 'p-2', 'mb-1', 'rounded-lg', 'hover:bg-[#32353b]', 'transition-colors', 'group'
    );

    const avatar = document.createElement('div');
    avatar.classList.add(
        'w-10', 'h-10', 'flex', 'items-center', 'justify-center',  'rounded-full', 'font-bold', 'text-white', 'text-xl', 'mr-3', 'select-none'
    );
    let avatarLetter = sender && sender.length > 0 ? sender[0].toUpperCase() : '?';
    let avatarBg = 'bg-[#5865f2]';
    if (type === 'error') {
        avatarBg = 'bg-[#f04747]';
    } else if (type === 'status') {
        avatarBg = 'bg-[#faa61a]';
    } else if (sender.toLowerCase() === 'bot') {
        avatarBg = 'bg-[#43b581]';
    }
    avatar.classList.remove('font-bold');
    avatar.classList.add(...avatarBg.split(' '));
    avatar.textContent = avatarLetter;
    message_element.appendChild(avatar);

    // Message content
    const content = document.createElement('div');
    content.classList.add('flex-1', 'min-w-0');

    // Username and timestamp
    const header = document.createElement('div');
    header.classList.add('flex', 'items-baseline', 'gap-2');

    const username = document.createElement('span');
    username.classList.add('font-semibold', 'text-base');
    if (sender.toLowerCase() === 'user') {
        username.textContent = 'You';
        username.classList.add('text-[#7289da]');
    } else if (sender.toLowerCase() === 'bot') {
        username.textContent = 'Bot';
        username.classList.add('text-[#43b581]');
    } else if (type === 'error') {
        username.textContent = 'Error';
        username.classList.add('text-[#f04747]');
    } else if (type === 'status') {
        username.textContent = 'Status';
        username.classList.add('text-[#faa61a]');
    } else {
        username.textContent = sender;
        username.classList.add('text-white');
    }

    const timestamp = document.createElement('span');
    timestamp.classList.add('text-xs', 'text-[#949ba4]', 'ml-2');
    const now = new Date();
    timestamp.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    header.appendChild(username);
    header.appendChild(timestamp);

    const text_span = document.createElement('div');
    text_span.classList.add(
        'text-base', 'text-gray-600', 'mt-0.5', 'break-words', 'transition-colors', 'group-hover:text-gray-300', 'flex', 'gap-1', 'flex-col'
    );
    text_span.innerHTML = text;
    
    if (!['bot', 'status', 'error'].includes(sender.toLowerCase())) {
        const temp = document.createElement('div');
        temp.textContent = text;
        text_span.innerHTML = temp.innerHTML;
    } else {
        text_span.innerHTML = text;
    }

    content.appendChild(header);
    content.appendChild(text_span);

    message_element.appendChild(content);
    chat_box.appendChild(message_element);
    chat_box.scrollTop = chat_box.scrollHeight;
}

function setChatEnabled(enabled) {
    message_input.disabled = !enabled;
    send_button.disabled = !enabled;
}

function startConversation() {
    if (socket && socket.connected) return;
    socket = io('http://localhost:5000');
    socket.on('connect', () => {
        connection_status.textContent = 'Connected';
        connection_status.className = 'status-online';
        addMessageToChat('Status', 'Connected to chat server.', 'status');
        setChatEnabled(true);
    });
    socket.on('disconnect', () => {
        connection_status.textContent = 'Disconnected';
        connection_status.className = 'status-offline';
        addMessageToChat('Status', 'You have been disconnected.', 'status');
        setChatEnabled(false);
    });
    socket.on('connection_status', (data) => {
        if (data.session_id) {
            usersession_id = data.session_id;
        }
    });
    socket.on('new_message', (data) => {
        addMessageToChat(data.sender, data.text);
    });
    socket.on('error', (data) => {
        addMessageToChat('Error', data.error, 'error');
    });
}

function endConversation() {
    if (socket && socket.connected) {
        socket.disconnect();
        setChatEnabled(false);
        addMessageToChat('Status', 'Conversation ended by user.', 'status');
    }
}

function sendMessageToServer() {
    const message_text = message_input.value.trim();
    if (message_text === '') return;
    if (socket && socket.connected) {
        addMessageToChat('user', message_text);
        socket.emit('send_message', { message: message_text });
        message_input.value = '';
        message_input.focus();
    } else {
        addMessageToChat('Error', 'Not connected to server.', 'error');
    }
}

setChatEnabled(false);
connection_status.textContent = 'Disconnected';
connection_status.className = 'status-offline';
addMessageToChat('Status', 'Click "Start conversation" to begin!', 'status');

start_button.addEventListener('click', startConversation);
end_button.addEventListener('click', endConversation);
send_button.addEventListener('click', sendMessageToServer);
message_input.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
        sendMessageToServer();
    }
});

