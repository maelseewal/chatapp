const socket = io()

const authContainer = document.getElementById("auth-container")
const chatContainer = document.getElementById("chat-container")
const profileContainer = document.getElementById("profile-container")
const authForm = document.getElementById("auth-form")
const authTitle = document.getElementById("auth-title")
const authSubmit = document.getElementById("auth-submit")
const authToggle = document.getElementById("auth-toggle")
const messageForm = document.getElementById("message-form")
const messageInput = document.getElementById("message-input")
const messages = document.getElementById("messages")
const profileForm = document.getElementById("profile-form")
const backToChat = document.getElementById("back-to-chat")
const profileButton = document.getElementById("profile-button")

let isLogin = true
let currentUser = null

authToggle.addEventListener("click", () => {
  isLogin = !isLogin
  authTitle.textContent = isLogin ? "Login" : "Registrierung"
  authSubmit.textContent = isLogin ? "Einloggen" : "Registrieren"
  authToggle.textContent = isLogin ? "Zur Registrierung wechseln" : "Zum Login wechseln"
})

authForm.addEventListener("submit", async (e) => {
  e.preventDefault()
  const username = document.getElementById("username").value
  const password = document.getElementById("password").value

  const response = await fetch(`/api/${isLogin ? "login" : "register"}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username, password }),
  })

  const data = await response.json()

  if (data.success) {
    currentUser = username
    authContainer.style.display = "none"
    chatContainer.style.display = "block"
    loadChatHistory()
  } else {
    alert(data.message)
  }
})

messageForm.addEventListener("submit", (e) => {
  e.preventDefault()
  if (messageInput.value) {
    socket.emit("chat message", { user: currentUser, message: messageInput.value })
    addMessage(`Sie: ${messageInput.value}`)
    messageInput.value = ""
  }
})

socket.on("chat message", (data) => {
  if (data.user !== currentUser) {
    addMessage(`${data.user}: ${data.message}`)
  }
})

function addMessage(msg) {
  const messageElement = document.createElement("div")
  messageElement.textContent = msg
  messages.appendChild(messageElement)
  messages.scrollTop = messages.scrollHeight
}

async function loadChatHistory() {
  const response = await fetch("/api/chat-history")
  const history = await response.json()
  messages.innerHTML = ""
  history.forEach((msg) => addMessage(`${msg.user}: ${msg.message}`))
}

profileForm.addEventListener("submit", async (e) => {
  e.preventDefault()
  const username = document.getElementById("profile-username").value
  const email = document.getElementById("profile-email").value

  const response = await fetch("/api/update-profile", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username: currentUser, newUsername: username, email }),
  })

  const data = await response.json()

  if (data.success) {
    currentUser = username
    alert("Profil aktualisiert!")
  } else {
    alert(data.message)
  }
})

backToChat.addEventListener("click", () => {
  profileContainer.style.display = "none"
  chatContainer.style.display = "block"
})

profileButton.addEventListener("click", async () => {
  chatContainer.style.display = "none"
  profileContainer.style.display = "block"

  const response = await fetch(`/api/profile?username=${currentUser}`)
  const data = await response.json()

  if (data.success) {
    document.getElementById("profile-username").value = data.username
    document.getElementById("profile-email").value = data.email
  }
})

