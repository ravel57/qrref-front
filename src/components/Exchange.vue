<template>
	<div class="exchange">
		<fwb-p v-if="error" class="error">{{ error }}</fwb-p>
		<fwb-p v-if="offline" class="error">
			Нет соединения с сервером в реальном времени (WebSocket): входящие сообщения могут не приходить.
		</fwb-p>

		<!-- Пока никто не сопряжён: мой QR и кнопка «сканировать QR собеседника» -->
		<div v-if="!roomId" class="waitBlock">
			<div v-if="key && !scanner.active">
				<img id="qr-img" :src="`/getQr/${key}`" alt="qrCode"/>
				<fwb-p class="qrHint">
					Отсканируйте этот QR-код в приложении qrRef (вкладка «Обмен» → «Сканировать QR собеседника»)
					или отсканируйте QR другого устройства кнопкой ниже.
				</fwb-p>
			</div>

			<div v-if="scanner.active" class="scanner">
				<div class="scannerHeader">
					<span>Сканер QR</span>
					<fwb-button color="default" size="xs" @click="stopScan">Закрыть</fwb-button>
				</div>
				<video ref="video" class="video" autoplay playsinline muted></video>
				<div class="scannerHint">Наведите камеру на QR-код собеседника.</div>
			</div>

			<div class="actions">
				<fwb-button v-if="!scanner.active" color="default" @click="startScan">
					Сканировать QR собеседника
				</fwb-button>
				<fwb-button color="default" @click="resetKey">Сбросить ключ</fwb-button>
			</div>
		</div>

		<!-- Чат -->
		<div
				v-else
				:class="['chat', {dragging}]"
				@dragover.prevent="dragging = true"
				@dragleave.prevent="dragging = false"
				@drop.prevent="onDrop"
		>
			<div class="chatHeader">
				<span>Чат</span>
				<span class="chatHeaderRight">
					<span class="chatStatus">устройства связаны</span>
					<fwb-button color="default" size="xs" @click="resetKey">Сбросить ключ</fwb-button>
				</span>
			</div>

			<div class="chatBody" ref="chatBody">
				<div v-for="m in messages" :key="m.id" :class="['msg', m.dir]">
					<a v-if="m.kind === 'file'" class="fileLink" :href="`/${m.path}`" :download="m.name">
						<span class="fileName">📎 {{ m.name }}</span>
						<span class="fileSize">{{ formatSize(m.size) }} · скачать</span>
					</a>
					<div v-else class="msgText">{{ m.text }}</div>
					<div class="msgMeta">{{ formatTime(m.ts) }}</div>
				</div>

				<div v-if="messages.length === 0" class="empty">Сообщений пока нет. Файлы можно перетащить сюда.</div>
			</div>

			<div class="chatInput" @keydown.enter.exact.prevent="send">
				<fwb-textarea
						v-model="draft"
						:rows="3"
						label="Сообщение"
						placeholder="Введите сообщение… (Enter — отправить, Shift+Enter — новая строка)"
				/>
				<div v-if="upload.active" class="uploadInfo">
					Отправка файла «{{ upload.name }}»… {{ upload.percent }}%
				</div>
				<div class="sendRow">
					<input ref="fileInput" type="file" multiple hidden @change="onFilesPicked"/>
					<fwb-button color="default" :disabled="upload.active" @click="$refs.fileInput.click()">
						Прикрепить файл
					</fwb-button>
					<fwb-button :disabled="!canSend" color="default" @click="send">Отправить</fwb-button>
				</div>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import axios from 'axios'
import {connect, disconnect, subscribeRoom} from '@/util/ws'
import {FwbButton, FwbP, FwbTextarea} from 'flowbite-vue'

type ChatMessage = {
	id: number
	kind: 'text' | 'file'
	text?: string
	name?: string
	size?: number
	path?: string
	dir: 'in' | 'out'
	ts: number
}

function extractKey(input: string): string {
	const trimmed = (input || '').trim()
	if (!trimmed) return ''
	try {
		const url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`)
		return url.searchParams.get('key') || url.searchParams.get('k') || ''
	} catch {
		return trimmed
	}
}

function sanitizeKey(key: string): string {
	return (key || '').toString().trim().replace(/[^a-zA-Z0-9_-]/g, '')
}

let nextMessageId = 0

export default {
	name: 'Exchange',

	components: {
		FwbButton,
		FwbP,
		FwbTextarea,
	},

	data: () => ({
		key: '',
		error: '',
		roomId: '',
		messages: [] as ChatMessage[],
		draft: '',
		sending: false,
		dragging: false,
		offline: false,
		offlineTimer: null as any,
		roomPollTimer: null as any,

		upload: {active: false, name: '', percent: 0},

		scanner: {
			active: false,
			stream: null as MediaStream | null,
			timer: null as any,
			lastValue: '',
		},
	}),

	computed: {
		canSend(): boolean {
			return !!this.roomId && !this.sending && !!this.draft && this.draft.trim().length > 0
		},
	},

	mounted() {
		this.init()
	},

	beforeUnmount() {
		this.stopScan()
		clearTimeout(this.offlineTimer)
		clearInterval(this.roomPollTimer)
		disconnect()
	},

	methods: {
		async init() {
			this.error = ''
			try {
				const r = await axios.get('/getKey')
				this.key = (r.data || '').toString().trim()
			} catch {
				this.error = 'Не удалось получить ключ'
				return
			}
			this.startConnection()

			// Страховка на случай, когда сокет не работает (например, прокси не пропускает WebSocket):
			// только тогда, и редко, спрашиваем сервер сами. Пока сокет жив, о мосте сообщает он.
			clearInterval(this.roomPollTimer)
			this.roomPollTimer = setInterval(() => {
				if (!this.roomId && this.offline) this.refreshRoom()
			}, 5000)
		},

		startConnection() {
			connect(this.key, {
				// сервер сообщает roomId обоим устройствам, когда мост создан
				onBridge: (roomId: string) => this.attachRoom(roomId),
				onRoom: (msg: any) => this.onRoomMessage(msg),
				// сообщение о мосте могло прийти, пока не было соединения, — спрашиваем сервер напрямую
				onConnect: () => this.refreshRoom(),
				onStatus: (online: boolean) => this.setOnline(online),
			})
			this.setOnline(false)
			this.refreshRoom()
		},

		/** Короткие обрывы и первое подключение не пугают пользователя: предупреждаем через 5 секунд. */
		setOnline(online: boolean) {
			clearTimeout(this.offlineTimer)
			if (online) {
				this.offline = false
			} else {
				this.offlineTimer = setTimeout(() => (this.offline = true), 5000)
			}
		},

		/** Новый ключ: старый QR перестаёт работать, связь с собеседником разрывается. */
		async resetKey() {
			if (this.roomId && !window.confirm('Сбросить ключ? Связь с собеседником будет разорвана.')) return
			try {
				const r = await axios.post('/resetKey')
				this.key = (r.data || '').toString().trim()
			} catch {
				this.error = 'Не удалось сбросить ключ'
				return
			}
			this.stopScan()
			this.roomId = ''
			this.messages = []
			this.draft = ''
			this.error = ''
			disconnect()
			this.startConnection()
		},

		async refreshRoom() {
			if (!this.key) return
			try {
				const r = await axios.get(`/room/${this.key}`)
				this.attachRoom((r.data?.room || '').toString().trim())
			} catch {
				// не сопряжено — это нормально
			}
		},

		attachRoom(roomId: string) {
			if (!roomId) return
			if (this.roomId !== roomId) {
				this.roomId = roomId
				this.messages = []
			}
			this.error = ''
			this.stopScan()
			subscribeRoom(roomId)
		},

		onRoomMessage(msg: any) {
			if (!msg) return
			const dir = msg.from === this.key ? 'out' : 'in'
			if (msg.type === 'text') {
				this.messages.push({id: nextMessageId++, kind: 'text', text: msg.text, dir, ts: msg.ts || Date.now()})
			} else if (msg.type === 'file') {
				this.messages.push({
					id: nextMessageId++, kind: 'file', name: msg.name, size: msg.size, path: msg.path,
					dir, ts: msg.ts || Date.now(),
				})
			} else {
				return
			}
			this.$nextTick(() => this.scrollChatToBottom())
		},

		async send() {
			if (!this.canSend) return
			const text = this.draft.trim()
			this.sending = true
			try {
				// своё сообщение вернётся из комнаты вместе с остальными — локально его не добавляем
				await axios.post(`/room/text/${this.key}`, {text})
				this.draft = ''
				this.error = ''
			} catch {
				this.error = 'Не удалось отправить сообщение'
			} finally {
				this.sending = false
			}
		},

		onFilesPicked(event: Event) {
			const input = event.target as HTMLInputElement
			const files = Array.from(input.files || [])
			input.value = ''
			this.uploadFiles(files)
		},

		onDrop(event: DragEvent) {
			this.dragging = false
			this.uploadFiles(Array.from(event.dataTransfer?.files || []))
		},

		async uploadFiles(files: File[]) {
			for (const file of files) {
				if (!this.roomId) return
				this.upload = {active: true, name: file.name, percent: 0}
				const form = new FormData()
				form.append('file', file)
				try {
					await axios.post(`/room/file/${this.key}`, form, {
						onUploadProgress: (e: any) => {
							if (e.total) this.upload.percent = Math.round((e.loaded / e.total) * 100)
						},
					})
					this.error = ''
				} catch {
					this.error = `Не удалось отправить файл «${file.name}»`
					break
				}
			}
			this.upload = {active: false, name: '', percent: 0}
		},

		/** Сканирование QR собеседника: свой ключ + отсканированный = мост. */
		async bridgeWith(rawValue: string) {
			const peerKey = sanitizeKey(extractKey(rawValue))
			if (!peerKey) return
			if (peerKey === this.key) {
				this.error = 'Это ваш собственный QR-код. Нужен QR другого устройства.'
				return
			}
			try {
				const r = await axios.post('/bridge', {a: this.key, b: peerKey})
				// не ждём сообщения по сокету — roomId есть в ответе
				this.attachRoom((r.data?.room || '').toString().trim())
			} catch {
				this.error = 'Не удалось связать устройства'
			}
		},

		formatTime(ts: number): string {
			return new Date(ts).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit', second: '2-digit'})
		},

		formatSize(bytes?: number): string {
			if (!bytes && bytes !== 0) return ''
			if (bytes >= 1 << 30) return `${(bytes / (1 << 30)).toFixed(1)} ГБ`
			if (bytes >= 1 << 20) return `${(bytes / (1 << 20)).toFixed(1)} МБ`
			if (bytes >= 1 << 10) return `${Math.round(bytes / (1 << 10))} КБ`
			return `${bytes} Б`
		},

		scrollChatToBottom() {
			const el = this.$refs.chatBody as HTMLElement | undefined
			if (el) el.scrollTop = el.scrollHeight
		},

		async startScan() {
			this.error = ''
			if (typeof (window as any).BarcodeDetector === 'undefined') {
				this.error = 'Сканер QR недоступен в этом браузере (нет BarcodeDetector). Отсканируйте QR этого устройства в приложении qrRef.'
				return
			}
			this.scanner.active = true
			await this.$nextTick()

			try {
				const stream = await navigator.mediaDevices.getUserMedia({
					video: {facingMode: 'environment'},
					audio: false,
				})
				this.scanner.stream = stream

				const video = this.$refs.video as HTMLVideoElement | undefined
				if (!video) throw new Error('no video')
				video.srcObject = stream
				await video.play()

				const detector = new (window as any).BarcodeDetector({formats: ['qr_code']})
				this.scanner.lastValue = ''

				this.scanner.timer = setInterval(async () => {
					if (!this.scanner.active) return
					try {
						const videoEl = this.$refs.video as HTMLVideoElement | undefined
						if (!videoEl || videoEl.readyState < 2) return

						const barcodes = await detector.detect(videoEl)
						const rawValue = (barcodes?.[0]?.rawValue || '').toString()
						if (!rawValue || rawValue === this.scanner.lastValue) return
						this.scanner.lastValue = rawValue
						await this.bridgeWith(rawValue)
					} catch {
						// ошибки отдельных кадров игнорируем
					}
				}, 250)
			} catch {
				this.error = 'Не удалось получить доступ к камере.'
				this.stopScan()
			}
		},

		stopScan() {
			if (this.scanner.timer) {
				clearInterval(this.scanner.timer)
				this.scanner.timer = null
			}
			if (this.scanner.stream) {
				this.scanner.stream.getTracks().forEach((t) => t.stop())
				this.scanner.stream = null
			}
			this.scanner.active = false
			this.scanner.lastValue = ''
		},
	},
}
</script>

<style scoped>
.exchange {
	width: 100%;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 14px;
}

.error {
	color: #ef4444 !important;
	margin-bottom: 8px;
}

.waitBlock {
	width: 100%;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 14px;
}

.qrHint {
	max-width: 520px;
	opacity: 0.7;
	font-size: 12px;
	text-align: center;
}

.actions {
	display: flex;
	gap: 10px;
	flex-wrap: wrap;
	justify-content: center;
}

.chat {
	width: 100%;
	max-width: 720px;
	border-radius: 12px;
	overflow: hidden;
	border: 1px solid rgba(0, 0, 0, 0.08);
}

.chat.dragging {
	outline: 2px dashed #3b82f6;
	outline-offset: -4px;
}

.chatHeader {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 10px 12px;
	font-weight: 600;
	background: rgba(0, 0, 0, 0.03);
}

.chatHeaderRight {
	display: flex;
	align-items: center;
	gap: 12px;
}

.chatStatus {
	font-size: 12px;
	font-weight: 400;
	color: #0a7;
}

.chatBody {
	min-height: 260px;
	max-height: 420px;
	overflow-y: auto;
	padding: 12px;
	display: flex;
	flex-direction: column;
	gap: 10px;
	background: rgba(0, 0, 0, 0.02);
}

.empty {
	opacity: 0.6;
	text-align: center;
	padding: 20px 0;
}

.msg {
	max-width: 85%;
	padding: 10px 10px;
	border-radius: 12px;
	display: flex;
	flex-direction: column;
	gap: 4px;
	border: 1px solid rgba(0, 0, 0, 0.07);
}

.msg.in {
	align-self: flex-start;
	background: rgba(0, 0, 0, 0.03);
}

.msg.out {
	align-self: flex-end;
	background: rgba(0, 0, 0, 0.06);
}

.msgText {
	white-space: pre-wrap;
	word-break: break-word;
}

.fileLink {
	display: flex;
	flex-direction: column;
	gap: 2px;
	color: #2563eb;
	text-decoration: none;
	word-break: break-all;
}

.fileLink:hover .fileName {
	text-decoration: underline;
}

.fileSize {
	font-size: 12px;
	opacity: 0.7;
}

.msgMeta {
	font-size: 11px;
	opacity: 0.6;
	align-self: flex-end;
}

.chatInput {
	padding: 12px;
	display: flex;
	flex-direction: column;
	gap: 10px;
	background: rgba(0, 0, 0, 0.01);
}

.uploadInfo {
	font-size: 12px;
	opacity: 0.8;
}

.sendRow {
	display: flex;
	justify-content: flex-end;
	gap: 10px;
}

.scanner {
	width: 100%;
	max-width: 520px;
	border-radius: 12px;
	border: 1px solid rgba(0, 0, 0, 0.08);
	overflow: hidden;
}

.scannerHeader {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 10px 12px;
	background: rgba(0, 0, 0, 0.03);
	font-weight: 600;
}

.video {
	width: 100%;
	height: auto;
	display: block;
}

.scannerHint {
	padding: 10px 12px;
	opacity: 0.7;
	font-size: 12px;
}
</style>

<!-- Тёмная тема включается классом .dark на <html> (см. App.vue), а не системной настройкой.
     Правила вынесены из scoped-блока: :global() в Vue 3.4 раскрывается в голый `.dark`. -->
<style>
.dark .exchange {
	color: #e5e7eb;
}

.dark .exchange .chat,
.dark .exchange .scanner {
	border-color: rgba(255, 255, 255, 0.14);
}

.dark .exchange .chatHeader,
.dark .exchange .scannerHeader {
	background: rgba(255, 255, 255, 0.07);
}

.dark .exchange .chatBody {
	background: rgba(255, 255, 255, 0.03);
}

.dark .exchange .chatInput {
	background: rgba(255, 255, 255, 0.02);
}

.dark .exchange .msg {
	border-color: rgba(255, 255, 255, 0.14);
}

.dark .exchange .msg.in {
	background: rgba(255, 255, 255, 0.07);
}

.dark .exchange .msg.out {
	background: rgba(59, 130, 246, 0.28);
}

.dark .exchange .fileLink {
	color: #93c5fd;
}
</style>
