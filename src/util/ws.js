import SockJS from "sockjs-client/dist/sockjs"
import {Client} from "@stomp/stompjs"

// Один STOMP-клиент на всё приложение. После каждого (пере)подключения заново подписывается на:
//   /topic/activity/{key} — текст/файл от «Отправки» (вкладка «Прием»)
//   /topic/bridge/{key}   — сюда сервер присылает roomId, когда устройство сопрягли (вкладка «Обмен»)
//   /topic/room/{roomId}  — сообщения чата
let client = null
let activeKey = ''
let roomId = ''
let roomSubscription = null
let handlers = {}

let text = ''

export function connect(key, {onRoom, onBridge, onConnect, onStatus} = {}) {
	if (!key) return

	handlers = {onRoom, onBridge, onConnect, onStatus}

	// Тот же ключ и клиент уже работает — ничего не пересоздаём, чтобы не терять сообщения при переподключении.
	if (client && activeKey === key) {
		if (client.connected) {
			if (handlers.onStatus) handlers.onStatus(true)
			if (handlers.onConnect) handlers.onConnect()
		}
		return
	}

	disconnect()
	activeKey = key

	const stomp = new Client({
		webSocketFactory: () => new SockJS("/websocket", null, {
			transports: ["websocket", "xhr-streaming", "xhr-polling"],
		}),
		reconnectDelay: 5000,
		debug: () => {
		},
	})

	// Статус нужен, чтобы показать пользователю, что сообщения по сокету не дойдут.
	const reportOffline = () => {
		if (handlers.onStatus) handlers.onStatus(false)
	}
	stomp.onWebSocketClose = reportOffline
	stomp.onWebSocketError = reportOffline
	stomp.onStompError = reportOffline

	stomp.onConnect = () => {
		if (handlers.onStatus) handlers.onStatus(true)
		stomp.subscribe(`/topic/activity/${key}`, (message) => {
			text = message.body
		})
		stomp.subscribe(`/topic/bridge/${key}`, (message) => {
			const id = (message.body || "").trim()
			if (id && handlers.onBridge) handlers.onBridge(id)
		})
		roomSubscription = null
		if (roomId) subscribeToRoom(stomp)
		// Сообщение о мосте могло прийти, пока соединения не было, — пусть компонент перепроверит.
		if (handlers.onConnect) handlers.onConnect()
	}

	client = stomp
	stomp.activate()
}

function subscribeToRoom(stomp) {
	if (roomSubscription) {
		try {
			roomSubscription.unsubscribe()
		} catch {
			// соединение уже закрыто
		}
		roomSubscription = null
	}
	if (!roomId || !stomp.connected) return
	roomSubscription = stomp.subscribe(`/topic/room/${roomId}`, (message) => {
		if (!handlers.onRoom) return
		try {
			handlers.onRoom(JSON.parse(message.body))
		} catch {
			handlers.onRoom({type: "raw", text: message.body})
		}
	})
}

export function subscribeRoom(id) {
	if (!id || id === roomId) return
	roomId = id
	if (client) subscribeToRoom(client)
}

/** Отписывается от текущей комнаты (чат закрыт). */
export function unsubscribeRoom() {
	roomId = ""
	if (roomSubscription) {
		try {
			roomSubscription.unsubscribe()
		} catch {
			// соединение уже закрыто
		}
		roomSubscription = null
	}
}

export function getText() {
	return text
}

export function resetText() {
	text = ""
}

export function disconnect() {
	if (client) {
		try {
			client.deactivate()
		} catch {
			// ничего страшного
		}
	}
	client = null
	activeKey = ''
	roomId = ''
	roomSubscription = null
}
