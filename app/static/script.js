let socket = null;
const chat_box = document.getElementById("chat-box");
const message_input = document.getElementById("message-input");
const send_button = document.getElementById("send-button");
const connection_status = document.getElementById("connection-status");
const toggle_button = document.getElementById("toggle-button"); // Use one button
let session_id = null;
const user = {
    name: document.querySelector("#user-name").value || "Unknown",
}

function addMessageToChat(sender, text, type = "normal", timeout = 0) {
    // Typing indicator with opacity animation
    if (timeout > 0) {
        const typingIndicator = document.getElementById("typing-indicator");
        if (typingIndicator) {
            typingIndicator.classList.remove('opacity-0');
            typingIndicator.classList.add('opacity-100', 'transition-opacity', 'duration-300');
            setTimeout(() => {
                typingIndicator.classList.remove('opacity-100');
                typingIndicator.classList.add('opacity-0');
                // After typing indicator fades out, show the message
                setTimeout(() => {
                    showMessage();
                }, 250)
            }, timeout);
            return; // Prevent message from showing immediately
        }
    }
    // If no timeout or no typing indicator, show message immediately
    showMessage();

    function showMessage() {
        const message_element = document.createElement("div");
        message_element.classList.add(
            "flex",
            "items-start",
            "p-2",
            "mb-1",
            "hover:border-gray-300",
            "transition-colors",
            "group",
            "border-b",
            "border-gray-600",
            "opacity-0", // Start hidden
            "transition-opacity",
            "duration-300"
        );

        const avatar = document.createElement("div");
        avatar.classList.add(
            "w-10",
            "h-10",
            "flex",
            "items-center",
            "justify-center",
            "rounded-full",
            "font-bold",
            "text-white",
            "text-xl",
            "mr-3",
            "select-none"
        );

        let senderName = sender;
        let avatarLetter = sender[0].toUpperCase();
        let avatarBg = "bg-[#5865f2]";
        if (sender.toLowerCase().startsWith("user_")) {
            senderName = sender.slice(5);
            avatarLetter = senderName && senderName.length > 0 ? senderName[0].toUpperCase() : "U";
            avatarBg = "bg-[#5865f2]";
        } else if (type === "error") {
            avatarBg = "bg-[#f04747]";
        } else if (type === "status") {
            avatarBg = "bg-[#faa61a]";
        } else if (sender.toLowerCase() === "bot") {
            avatarBg = "bg-[#43b581]";
        }
        avatar.classList.remove("font-bold");
        avatar.classList.add(...avatarBg.split(" "));
        avatar.textContent = avatarLetter;
        message_element.appendChild(avatar);

        const content = document.createElement("div");
        content.classList.add("flex-1", "min-w-0");

        // Username and timestamp
        const header = document.createElement("div");
        header.classList.add("flex", "items-baseline", "gap-2");

        const username = document.createElement("span");
        username.classList.add("font-semibold", "text-base");
        // Handle user_(username) format
        if (sender.toLowerCase().startsWith("user_")) {
            if (senderName === user.name.value || senderName === user.name) {
                username.textContent = "You";
                username.classList.add("text-[#7289da]");
            } else {
                username.textContent = senderName;
                username.classList.add("text-white");
            }
        } else if (sender.toLowerCase() === "bot") {
            username.textContent = "Bot";
            username.classList.add("text-[#43b581]");
        } else if (type === "error") {
            username.textContent = "Error";
            username.classList.add("text-[#f04747]");
        } else if (type === "status") {
            username.textContent = "Status";
            username.classList.add("text-[#faa61a]");
        } else {
            username.textContent = user.name || sender.username || "UserNotFound(404)";
            username.classList.add("text-white");
            return;
        }

        const timestamp = document.createElement("span");
        timestamp.classList.add("text-xs", "text-[#949ba4]", "ml-2");
        const now = new Date();
        timestamp.textContent = now.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
        });

        header.appendChild(username);
        header.appendChild(timestamp);

        const text_span = document.createElement("div");
        text_span.classList.add(
            "text-base",
            "text-gray-300",
            "mt-0.5",
            "break-words",
            "transition-colors",
            "flex",
            "gap-1",
            "flex-col",
            "duration-50"
        );

        // Fix: use replace instead of remove, and check sender type correctly
        if (!["bot", "status", "error"].includes(sender.toLowerCase().replace('user_', ''))) {
            const temp = document.createElement("div");
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

        // Animate opacity from 0 to 1
        setTimeout(() => {
            message_element.classList.remove("opacity-0");
            message_element.classList.add("opacity-100");
        }, 10);
    }
}

function setChatEnabled(enabled) {
    message_input.disabled = !enabled;
    send_button.disabled = !enabled;
}

function startConversation() {
  user.name = document.querySelector("#user-name").value || "Unknown"
  if (!user.name || user.name.trim() === "") {
    addMessageToChat("Error", "Please input your username first!", "error");
    return;
  }
  toggle_button.classList.remove(
    "border-green-700",
    "hover:bg-green-700",
    "text-green-700"
  );
  toggle_button.classList.add(
    "border-red-500",
    "hover:bg-red-500",
    "text-red-500"
  );
  if (socket && socket.connected) return;
  socket = io("10.142.227.163:5000", {
    transports: ["websocket"],
    upgrade: false,
  });
  socket.on("connect", () => {
    connection_status.textContent = "Connected";
    connection_status.className =
      "text-green-500 text-sm p-3 border-2 border-green-500 font-semibold rounded-full";
    addMessageToChat("Status", "Connected to chat server.", "status");
    setChatEnabled(true);
  });
  socket.on("disconnect", () => {
    connection_status.textContent = "Disconnected";
    connection_status.className =
      "text-red-500 text-sm p-3 border-2 border-red-500 font-semibold rounded-full";
    addMessageToChat("Status", "You have been disconnected.", "status");
    setChatEnabled(false);
  });
  socket.on("connection_status", (data) => {
    if (data.session_id) {
      session_id = data.session_id;
    }
  });
  socket.on("new_message", (data) => {
    addMessageToChat(data.sender, data.text, data.type || "normal", data.timeout || 750);
  });
  socket.on("error", (data) => {
    addMessageToChat("Error", data.error, "error");
  });
}

function endConversation() {
  if (socket && socket.connected) {
    socket.disconnect();
    setChatEnabled(false);
    addMessageToChat("Status", "Conversation ended by user.", "status");
    toggle_button.classList.remove(
      "border-red-500",
      "hover:bg-red-500",
      "text-red-500"
    );
    toggle_button.classList.add(
      "border-green-700",
      "hover:bg-green-700",
      "text-green-700"
    );
  }
}

function toggleConversation() {
  if (socket && socket.connected) {
    endConversation();
  } else {
    startConversation();
  }
}

function sendMessageToServer() {
  const message_text = message_input.value.trim();
  if (message_text === "") return;
  if (socket && socket.connected) {
    addMessageToChat(`user_${user.name}`, message_text);
    socket.emit("send_message", { message: message_text });
    message_input.value = "";
    message_input.focus();
  } else {
    addMessageToChat("Error", "Not connected to server.", "error");
  }
}

setChatEnabled(false);
connection_status.textContent = "Disconnected";
connection_status.className =
  "text-red-500 text-sm p-3 border-2 border-red-500 font-semibold rounded-full";
addMessageToChat("Status", 'Click "Start Conversation" to begin!', "status");

toggle_button.addEventListener("click", toggleConversation);
send_button.addEventListener("click", sendMessageToServer);
message_input.addEventListener("keypress", (event) => {
  if (event.key === "Enter") {
    sendMessageToServer();
  }
});
