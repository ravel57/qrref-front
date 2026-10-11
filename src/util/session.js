import {reactive} from "vue"
import axios from "axios"
import {connect, disconnect, subscribeRoom, unsubscribeRoom} from "@/util/ws"

// Общее состояние сайта: ключ этого устройства, соединение с сервером и чат.
// Чат открывается поверх любого режима, как только устройство связано с другим (мост создан).
export const session = reactive({
	key: "",
	roomId: "",
	messages: [],
	offline: false,
})

let nextMessageId = 0
let offlineTimer = null
let roomPollTimer = null

export async function startSession() {
	if (!session.key) {
		try {
			session.key = String((await axios.get("/getKey")).data || "").trim()
		} catch {
			return false
		}
	}
	openConnection()

	// Страховка на случай, когда сокет не работает (например, прокси не пропускает WebSocket):
	// только тогда, и редко, спрашиваем сервер сами. Пока сокет жив, о мосте сообщает он.
	clearInterval(roomPollTimer)
	roomPollTimer = setInterval(() => {
		if (!session.roomId && session.offline) refreshRoom()
	}, 5000)
	return true
}

function openConnection() {
	// Сначала «нет связи», потом connect(): если соединение уже установлено, connect() сам сообщит onStatus(true).
	setOnline(false)
	connect(session.key, {
		onBridge: attachRoom,
		onRoom: onRoomMessage,
		onConnect: refreshRoom,
		onStatus: setOnline,
	})
	refreshRoom()
}

/** Короткие обрывы и первое подключение не пугают: предупреждаем через 5 секунд. */
function setOnline(online) {
	clearTimeout(offlineTimer)
	if (online) {
		session.offline = false
	} else {
		offlineTimer = setTimeout(() => (session.offline = true), 5000)
	}
}

export async function refreshRoom() {
	if (!session.key) return
	try {
		const r = await axios.get(`/room/${session.key}`)
		attachRoom(String(r.data?.room || "").trim())
	} catch {
		// сервер недоступен — повторим при следующем подключении
	}
}

export function attachRoom(roomId) {
	if (!roomId) return
	if (session.roomId !== roomId) {
		session.roomId = roomId
		session.messages = []
	}
	subscribeRoom(roomId)
}

function clearRoom() {
	session.roomId = ""
	session.messages = []
	unsubscribeRoom()
}

function onRoomMessage(msg) {
	if (!msg) return
	if (msg.type === "closed") {
		clearRoom()
		return
	}
	const dir = msg.from === session.key ? "out" : "in"
	if (msg.type === "text") {
		session.messages.push({id: nextMessageId++, kind: "text", text: msg.text, dir, ts: msg.ts || Date.now()})
	} else if (msg.type === "file") {
		session.messages.push({
			id: nextMessageId++, kind: "file", name: msg.name, size: msg.size, path: msg.path,
			dir, ts: msg.ts || Date.now(),
		})
	}
}

/** Чат с устройством, чей QR отсканирован: свой ключ + чужой = мост. */
export async function startChatWith(peerKey) {
	const r = await axios.post("/bridge", {a: session.key, b: peerKey})
	attachRoom(String(r.data?.room || "").trim())
}

/** Связывает чатом два других компьютера (оба получат чат). */
export async function pairComputers(firstKey, secondKey) {
	await axios.post("/bridge", {a: firstKey, b: secondKey})
}

export async function leaveChat() {
	try {
		await axios.post(`/room/leave/${session.key}`)
	} finally {
		clearRoom()
	}
}

/** Новый ключ: старый QR перестаёт работать, чат (если был) закрывается у обоих. */
export async function resetKey() {
	const r = await axios.post("/resetKey")
	session.key = String(r.data || "").trim()
	clearRoom()
	disconnect()
	openConnection()
}

export function stopSession() {
	clearInterval(roomPollTimer)
	clearTimeout(offlineTimer)
	disconnect()
}
