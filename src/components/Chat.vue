<template>
	<div class="exchange">
		<fwb-p v-if="error" class="error">{{ error }}</fwb-p>
		<fwb-p v-if="session.offline" class="error">
			{{ $t('chatOffline') }}
		</fwb-p>

		<div
				:class="['chat', {dragging}]"
				@dragover.prevent="dragging = true"
				@dragleave.prevent="dragging = false"
				@drop.prevent="onDrop"
		>
			<div class="chatHeader">
				<span>{{ $t('chatTitle') }}</span>
				<span class="chatHeaderRight">
					<span class="chatStatus">{{ $t('chatLinked') }}</span>
					<fwb-button color="default" size="xs" @click="close">{{ $t('chatClose') }}</fwb-button>
				</span>
			</div>

			<div class="chatBody" ref="chatBody">
				<div v-for="m in session.messages" :key="m.id" :class="['msg', m.dir]">
					<a v-if="m.kind === 'file'" class="fileLink" :href="`/${m.path}`" :download="m.name">
						<span class="fileName">📎 {{ m.name }}</span>
						<span class="fileSize">{{ formatSize(m.size) }} · {{ $t('chatDownload') }}</span>
					</a>
					<div v-else class="msgText">{{ m.text }}</div>
					<div class="msgMeta">{{ formatTime(m.ts) }}</div>
				</div>

				<div v-if="session.messages.length === 0" class="empty">{{ $t('chatEmpty') }}</div>
			</div>

			<div class="chatInput" @keydown.enter.exact.prevent="send">
				<fwb-textarea
						v-model="draft"
						:rows="3"
						:label="$t('chatMessage')"
						:placeholder="$t('chatPlaceholder')"
				/>
				<div v-if="upload.active" class="uploadInfo">
					{{ $t('chatUploading', {name: upload.name, percent: upload.percent}) }}
				</div>
				<div class="sendRow">
					<input ref="fileInput" type="file" multiple hidden @change="onFilesPicked"/>
					<fwb-button color="default" :disabled="upload.active" @click="$refs.fileInput.click()">
						{{ $t('chatAttach') }}
					</fwb-button>
					<fwb-button :disabled="!canSend" color="default" @click="send">{{ $t('chatSend') }}</fwb-button>
				</div>
			</div>
		</div>
	</div>
</template>

<script>
import axios from 'axios'
import {FwbButton, FwbP, FwbTextarea} from 'flowbite-vue'
import {leaveChat, session} from '@/util/session'
import {t} from '@/util/i18n'

/** Окно чата между устройствами. Показывается поверх любого режима, пока есть связь (session.roomId). */
export default {
	name: 'Chat',

	components: {FwbButton, FwbP, FwbTextarea},

	data: () => ({
		session,
		error: '',
		draft: '',
		sending: false,
		dragging: false,
		upload: {active: false, name: '', percent: 0},
	}),

	computed: {
		canSend() {
			return !this.sending && !!this.draft && this.draft.trim().length > 0
		},
	},

	watch: {
		'session.messages.length'() {
			this.$nextTick(() => this.scrollChatToBottom())
		},
	},

	mounted() {
		this.$nextTick(() => this.scrollChatToBottom())
	},

	methods: {
		async send() {
			if (!this.canSend) return
			const text = this.draft.trim()
			this.sending = true
			try {
				// своё сообщение вернётся из комнаты вместе с остальными — локально его не добавляем
				await axios.post(`/room/text/${session.key}`, {text})
				this.draft = ''
				this.error = ''
			} catch {
				this.error = t('chatErrSend')
			} finally {
				this.sending = false
			}
		},

		async close() {
			try {
				await leaveChat()
			} catch {
				this.error = t('chatErrClose')
			}
		},

		onFilesPicked(event) {
			const input = event.target
			const files = Array.from(input.files || [])
			input.value = ''
			this.uploadFiles(files)
		},

		onDrop(event) {
			this.dragging = false
			this.uploadFiles(Array.from(event.dataTransfer?.files || []))
		},

		async uploadFiles(files) {
			for (const file of files) {
				this.upload = {active: true, name: file.name, percent: 0}
				const form = new FormData()
				form.append('file', file)
				try {
					await axios.post(`/room/file/${session.key}`, form, {
						onUploadProgress: (e) => {
							if (e.total) this.upload.percent = Math.round((e.loaded / e.total) * 100)
						},
					})
					this.error = ''
				} catch {
					this.error = t('chatErrFile', {name: file.name})
					break
				}
			}
			this.upload = {active: false, name: '', percent: 0}
		},

		formatTime(ts) {
			return new Date(ts).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit', second: '2-digit'})
		},

		formatSize(bytes) {
			if (!bytes && bytes !== 0) return ''
			if (bytes >= 1 << 30) return `${(bytes / (1 << 30)).toFixed(1)} ${t('unitGb')}`
			if (bytes >= 1 << 20) return `${(bytes / (1 << 20)).toFixed(1)} ${t('unitMb')}`
			if (bytes >= 1 << 10) return `${Math.round(bytes / (1 << 10))} ${t('unitKb')}`
			return `${bytes} ${t('unitB')}`
		},

		scrollChatToBottom() {
			const el = this.$refs.chatBody
			if (el) el.scrollTop = el.scrollHeight
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
</style>

<!-- Тёмная тема включается классом .dark на <html> (см. App.vue), а не системной настройкой.
     Правила вынесены из scoped-блока: :global() в Vue 3.4 раскрывается в голый `.dark`. -->
<style>
.dark .exchange {
	color: #e5e7eb;
}

.dark .exchange .chat {
	border-color: rgba(255, 255, 255, 0.14);
}

.dark .exchange .chatHeader {
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
