<template>
	<div class="scanner">
		<fwb-p style="color: red; margin-top: 15px" v-if="error">{{ error }}</fwb-p>
		<fwb-p class="ok" v-if="info">{{ info }}</fwb-p>

		<!-- 1. Сканер: ищем QR устройства (или второго компьютера для связи двух устройств) -->
		<template v-if="step === 'scan' || step === 'scanSecond'">
			<fwb-p class="hint">
				{{ step === 'scan' ? $t('scanHint') : $t('scanSecondHint') }}
			</fwb-p>
			<qrcode-stream
					class="qrcode-stream"
					:track="paintOutline"
					@decode="onDecode"
					@init="onInit"
			/>
			<fwb-button v-if="step === 'scanSecond'" class="back" color="default" @click="step = 'options'">
				{{ $t('back') }}
			</fwb-button>
		</template>

		<!-- 2. Что делать с отсканированным устройством -->
		<div v-else-if="step === 'options'" class="menu">
			<fwb-p class="menu-title">{{ $t('qrScanned') }}</fwb-p>
			<fwb-p class="menu-key">{{ shortKey(target) }}</fwb-p>
			<fwb-button class="menu-btn" color="default" @click="step = 'compose'">
				{{ $t('optSend') }}
			</fwb-button>
			<fwb-button class="menu-btn" color="default" :disabled="busy" @click="startChat">
				{{ $t('optChat') }}
			</fwb-button>
			<fwb-button class="menu-btn" color="default" @click="step = 'scanSecond'">
				{{ $t('optChatOther') }}
			</fwb-button>
			<fwb-button class="menu-btn" color="alternative" @click="rescan">
				{{ $t('rescan') }}
			</fwb-button>
		</div>

		<!-- 3. Отправка текста или файла на отсканированное устройство -->
		<template v-else-if="step === 'compose'">
			<div class="inline-flex rounded-md shadow-sm buttonBlock">
				<a
						@click="isText = true"
						aria-current="page"
						class="px-4 py-2 text-sm font-medium text-blue-700 bg-white border border-gray-200 rounded-s-lg hover:bg-gray-100 focus:z-10 focus:ring-2 focus:ring-blue-700 focus:text-blue-700 dark:bg-gray-800 dark:border-gray-700 dark:text-white dark:hover:text-white dark:hover:bg-gray-700 dark:focus:ring-blue-500 dark:focus:text-white"
						v-text="$t('tabText')"
				/>
				<a
						@click="isText = false"
						class="px-4 py-2 text-sm font-medium text-gray-900 bg-white border border-gray-200 rounded-e-lg hover:bg-gray-100 hover:text-blue-700 focus:z-10 focus:ring-2 focus:ring-blue-700 focus:text-blue-700 dark:bg-gray-800 dark:border-gray-700 dark:text-white dark:hover:text-white dark:hover:bg-gray-700 dark:focus:ring-blue-500 dark:focus:text-white"
						v-text="$t('tabFile')"
				/>
			</div>

			<fwb-textarea
					v-if="isText"
					v-model="text"
					:rows="4"
					:label="$t('textLabel')"
					:placeholder="$t('textPlaceholder')"
			/>
			<fwb-file-input
					v-else
					class="file-input"
					style="margin: 15px 0 0"
					v-model="file"
					:label="$t('fileLabel')"
			/>

			<div class="compose-actions">
				<fwb-button color="default" :disabled="busy || !canSend" @click="send">{{ $t('send') }}</fwb-button>
				<fwb-button color="alternative" :disabled="busy" @click="step = 'options'">{{ $t('back') }}</fwb-button>
			</div>
		</template>
	</div>
</template>


<script>
import axios from "axios"
import {QrcodeStream} from "qrcode-reader-vue3"
import {FwbButton, FwbFileInput, FwbP, FwbTextarea} from "flowbite-vue"
import {pairComputers, session, startChatWith} from "@/util/session"
import {t} from "@/util/i18n"

const KEY_PATTERN = /^[A-Za-z0-9_-]{1,128}$/

/** Достаёт ключ из содержимого QR (ссылка вида https://qrref.io/?key=...). Пустая строка — не наш QR. */
function extractKey(scanned) {
	const str = (scanned || "").toString().trim()
	if (!str) return ""
	let url
	try {
		url = new URL(/^https?:\/\//i.test(str) ? str : "https://" + str)
	} catch {
		return ""
	}
	const key = (url.searchParams.get("key") || url.searchParams.get("k") || "").trim()
	return KEY_PATTERN.test(key) ? key : ""
}

export default {
	name: "Scanner",

	components: {
		FwbButton,
		FwbFileInput,
		FwbP,
		FwbTextarea,
		QrcodeStream,
	},

	data() {
		return {
			// scan → options → (compose | scanSecond)
			step: "scan",
			target: "",
			isText: true,
			file: null,
			text: "",
			error: "",
			info: "",
			busy: false,
		}
	},

	computed: {
		canSend() {
			return this.isText ? this.text.trim().length > 0 : !!this.file
		},
	},

	mounted() {
		// Страницу открыли по ссылке из QR (камерой телефона): сразу показываем действия для этого устройства.
		const params = new URLSearchParams(window.location.search)
		const key = (params.get("key") || params.get("k") || "").trim()
		if (KEY_PATTERN.test(key)) {
			this.target = key
			this.step = "options"
			window.history.replaceState({}, "", window.location.pathname)
		}
	},

	methods: {
		shortKey(key) {
			return key.length > 12 ? `${key.slice(0, 6)}…${key.slice(-4)}` : key
		},

		rescan() {
			this.target = ""
			this.error = ""
			this.info = ""
			this.step = "scan"
		},

		async onDecode(scanned) {
			if (this.busy || (this.step !== "scan" && this.step !== "scanSecond")) return
			this.error = ""
			this.info = ""

			const key = extractKey(scanned)
			if (!key) {
				this.error = t("errNotQr")
				return
			}

			if (this.step === "scan") {
				this.target = key
				this.step = "options"
				return
			}

			// Второй QR: связываем чатом два компьютера (у обоих откроется окно чата).
			if (key === this.target) {
				this.error = t("errSameQr")
				return
			}
			this.busy = true
			try {
				await pairComputers(this.target, key)
				this.rescan()
				this.info = t("paired")
			} catch {
				this.error = t("errPair")
			} finally {
				this.busy = false
			}
		},

		async startChat() {
			this.error = ""
			if (this.target === session.key) {
				this.error = t("errSameDevice")
				return
			}
			this.busy = true
			try {
				await startChatWith(this.target)
				// чат откроется поверх экрана — App следит за session.roomId
			} catch {
				this.error = t("errChat")
			} finally {
				this.busy = false
			}
		},

		async send() {
			this.error = ""
			this.busy = true
			try {
				if (this.isText) {
					await axios.post(`/text/${this.target}`, {text: this.text})
					this.text = ""
				} else {
					const formData = new FormData()
					formData.append("file", this.file)
					await axios.post(`/file/${this.target}`, formData, {
						headers: {"Content-Type": "multipart/form-data"},
					})
					this.file = null
				}
				this.info = t("sent")
				this.step = "options"
			} catch {
				this.error = t("errSend")
			} finally {
				this.busy = false
			}
		},

		async onInit(promise) {
			try {
				await promise
			} catch (error) {
				if (error.name === "NotAllowedError") {
					this.error = t("camDenied")
				} else if (error.name === "NotFoundError") {
					this.error = t("camNone")
				} else if (error.name === "NotSupportedError") {
					this.error = t("camSecure")
				} else if (error.name === "NotReadableError") {
					this.error = t("camBusy")
				} else if (error.name === "OverconstrainedError") {
					this.error = t("camConstraints")
				} else if (error.name === "StreamApiNotSupportedError") {
					this.error = t("camNoStream")
				} else if (error.name === "InsecureContextError") {
					this.error = t("camInsecure")
				} else {
					this.error = t("camOther", {name: error.name})
				}
			}
		},

		paintOutline(detectedCodes, ctx) {
			for (const detectedCode of detectedCodes) {
				const [firstPoint, ...otherPoints] = detectedCode.cornerPoints
				ctx.strokeStyle = "red"
				ctx.beginPath()
				ctx.moveTo(firstPoint.x, firstPoint.y)
				for (const {x, y} of otherPoints) {
					ctx.lineTo(x, y)
				}
				ctx.lineTo(firstPoint.x, firstPoint.y)
				ctx.closePath()
				ctx.stroke()
			}
		},
	},

	watch: {
		text() {
			// если начали вводить текст — файл сбрасываем
			if (this.text) this.file = null
		},
		file() {
			// если выбрали файл — текст сбрасываем
			if (this.file) this.text = ""
		},
	},
}
</script>


<style scoped>

.qrcode-stream {
	margin-top: 15px;
	width: 50%;
}

.scanner {
	width: 100%;
	height: 100%;
	display: flex;
	flex-direction: column;
	align-items: center;
}

span {
	margin-top: 15px;
	margin-bottom: 0;
}

label {
	margin-top: 15px;
	max-width: 70%;
	min-width: 50%;
	margin-bottom: 0;
}

.buttonBlock {
	width: 50%;

	a {
		cursor: pointer;
		width: 100%;
		text-align: center;
	}
}

.file-input {
	width: 50%;
}

.hint {
	opacity: 0.75;
	margin-top: 15px;
	text-align: center;
}

.ok {
	color: #0a7;
	font-weight: 600;
	margin-top: 15px;
}

.back {
	margin-top: 15px;
}

.menu {
	width: 100%;
	max-width: 460px;
	margin-top: 15px;
	display: flex;
	flex-direction: column;
	align-items: stretch;
	gap: 10px;
}

.menu-title {
	text-align: center;
	font-weight: 700;
}

.menu-key {
	text-align: center;
	opacity: 0.6;
	font-size: 13px;
	margin-top: -6px;
	word-break: break-all;
}

.menu-btn {
	width: 100%;
	white-space: normal;
}

.compose-actions {
	display: flex;
	gap: 10px;
	margin-top: 15px;
}

@media screen and (max-width: 650px) {

	.qrcode-stream {
		width: 100%;
	}

	p {
		font-size: 12px;
	}

	label {
		font-size: 12px;
		width: 100%;
	}

	span {
		font-size: 12px;
		width: 100%;
		margin-top: 15px;
		margin-bottom: 0;
	}

	.scanner {
		width: 200%;

		.file-input {
			width: unset;
		}
	}

	.buttonBlock {
		width: 100%;
	}

	.file-input {
		width: 100%;
	}

	.menu {
		max-width: none;
	}
}
</style>
