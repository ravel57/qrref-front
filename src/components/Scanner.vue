<template>
	<div class="scanner">
		<fwb-p style="color: red; margin-top: 15px" v-if="error">{{ error }}</fwb-p>

		<!-- Режим сопряжения через /bridge -->
		<div class="pairing" v-if="pairing.active">
			<fwb-p class="pairing-title">Сопряжение через bridge</fwb-p>
			<fwb-p class="pairing-hint">
				<span v-if="!pairing.aKey">
					Шаг 1: отсканируйте QR первого компьютера (сессия A).
				</span>
				<span v-else>
					Шаг 2: отсканируйте QR второго компьютера (сессия B).
				</span>
			</fwb-p>

			<div class="pairing-row">
				<div><b>A:</b> {{ pairing.aKey || '—' }}</div>
				<div><b>B:</b> {{ pairing.bKey || '—' }}</div>
			</div>

			<fwb-p v-if="pairing.statusText" :class="pairing.statusClass">{{ pairing.statusText }}</fwb-p>

			<div class="pairing-actions">
				<fwb-button color="default" @click="pairReset">Сбросить</fwb-button>
				<fwb-button color="default" @click="pairing.active = false">Выйти</fwb-button>
			</div>
		</div>

		<!-- Режим отправки текста/файла -->
		<div v-else class="sendMode">
			<div class="inline-flex rounded-md shadow-sm buttonBlock">
				<a
						@click="isText = true"
						aria-current="page"
						class="px-4 py-2 text-sm font-medium text-blue-700 bg-white border border-gray-200 rounded-s-lg hover:bg-gray-100 focus:z-10 focus:ring-2 focus:ring-blue-700 focus:text-blue-700 dark:bg-gray-800 dark:border-gray-700 dark:text-white dark:hover:text-white dark:hover:bg-gray-700 dark:focus:ring-blue-500 dark:focus:text-white"
						v-text="'Текст'"
				/>
				<a
						@click="isText = false"
						class="px-4 py-2 text-sm font-medium text-gray-900 bg-white border border-gray-200 rounded-e-lg hover:bg-gray-100 hover:text-blue-700 focus:z-10 focus:ring-2 focus:ring-blue-700 focus:text-blue-700 dark:bg-gray-800 dark:border-gray-700 dark:text-white dark:hover:text-white dark:hover:bg-gray-700 dark:focus:ring-blue-500 dark:focus:text-white"
						v-text="'Файл'"
				/>
			</div>

			<div class="sendBlock">
				<fwb-textarea
						v-if="isText"
						class="sendControl"
						v-model="text"
						:rows="4"
						label="Текст для пересылки"
						placeholder="Write your message..."
				/>

				<fwb-file-input
						v-else
						class="file-input sendControl"
						style="margin: 15px 0 0"
						v-model="file"
						label="Файл для пересылки"
				/>
			</div>

			<div class="pairStart">
				<fwb-button color="default" @click="pairStart">
					Сопряжение (bridge)
				</fwb-button>
			</div>
		</div>

		<!-- Сканер -->
		<qrcode-stream
				class="qrcode-stream"
				:track="paintOutline"
				@decode="onDecode"
				@init="onInit"
		/>
	</div>
</template>


<script>
import axios from "axios"
import {QrcodeStream} from "qrcode-reader-vue3"
import {FwbButton, FwbFileInput, FwbP, FwbTextarea} from "flowbite-vue"

function normalizeToUrl(s) {
	const str = (s || "").toString().trim()
	if (!str) return null

	// FIX: было OR, из-за этого условие всегда true
	if (!str.startsWith("http://") && !str.startsWith("https://")) {
		return new URL("https://" + str)
	}
	return new URL(str)
}

function extractKeyFromUrl(url) {
	return (
			url.searchParams.get("key") ||
			url.searchParams.get("k") ||
			""
	).toString().trim()
}

function isBridgeQr(url) {
	// “QR ведет на ручку bridge” — распознаём по pathname или по наличию a/b параметров
	const path = (url.pathname || "").toLowerCase()
	const hasAB = !!(url.searchParams.get("a") && url.searchParams.get("b"))
	return path.includes("/bridge") || hasAB || url.searchParams.get("bridge") === "1"
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
			isText: true,
			scanResult: "",
			file: null,
			error: "",
			text: "",

			pairing: {
				active: false,
				aKey: "",
				bKey: "",
				statusText: "",
				statusClass: "hint",
			},
		}
	},

	mounted() {
		const savedA = localStorage.getItem("bridge_a") || ""
		if (savedA) {
			this.pairing.active = true
			this.pairing.aKey = savedA
			this.pairing.statusText = "Найдена сохранённая сессия A. Отсканируйте второй QR (сессия B)."
			this.pairing.statusClass = "hint"
		}
	},

	methods: {
		pairStart() {
			this.error = ""
			this.pairing.active = true

			const savedA = localStorage.getItem("bridge_a") || ""
			if (savedA && !this.pairing.aKey) this.pairing.aKey = savedA
			this.pairing.statusText = this.pairing.aKey
					? "Отсканируйте второй QR (сессия B)."
					: "Отсканируйте первый QR (сессия A)."
			this.pairing.statusClass = "hint"
		},

		pairReset() {
			localStorage.removeItem("bridge_a")
			this.pairing.aKey = ""
			this.pairing.bKey = ""
			this.pairing.statusText = "Сессия сброшена. Отсканируйте первый QR (сессия A)."
			this.pairing.statusClass = "hint"
		},

		async onDecode(scanResult) {
			this.error = ""

			let url
			try {
				url = normalizeToUrl(scanResult)
				if (!url) return
			} catch (e) {
				this.error = "Невалидный QR (не URL)."
				return
			}

			this.scanResult = url.toString()

			if (isBridgeQr(url) || this.pairing.active) {
				const aFromQr = (url.searchParams.get("a") || "").toString().trim()
				const bFromQr = (url.searchParams.get("b") || "").toString().trim()

				if (aFromQr && bFromQr) {
					await this.createBridge(aFromQr, bFromQr)
					return
				}

				const key = extractKeyFromUrl(url)
				if (!key) {
					this.pairing.active = true
					this.pairing.statusText = "В QR нет параметра key."
					this.pairing.statusClass = "err"
					return
				}

				this.pairing.active = true

				if (!this.pairing.aKey) {
					this.pairing.aKey = key
					localStorage.setItem("bridge_a", key)
					this.pairing.statusText = "Сессия A открыта. Теперь отсканируйте второй QR (сессия B)."
					this.pairing.statusClass = "hint"
					return
				}

				if (this.pairing.aKey === key) {
					this.pairing.statusText = "Отсканирован тот же QR. Нужен QR второго компьютера."
					this.pairing.statusClass = "err"
					return
				}

				this.pairing.bKey = key
				await this.createBridge(this.pairing.aKey, this.pairing.bKey)
				return
			}

			const key = extractKeyFromUrl(url)
			if (!key) {
				this.error = "В QR нет параметра key."
				return
			}

			if (this.text && this.text.toString().trim()) {
				await axios.post(`/text/${key}`, {text: this.text})
			}

			if (this.file) {
				const formData = new FormData()
				formData.append("file", this.file)
				await axios.post(`/file/${key}`, formData, {
					headers: {"Content-Type": "multipart/form-data"},
				})
				this.file = null
			}
		},

		async createBridge(a, b) {
			this.pairing.statusText = "Создаю мост..."
			this.pairing.statusClass = "hint"

			try {
				await axios.post("/bridge", {a, b})
				this.pairing.statusText = "Мост создан. Теперь компьютеры могут общаться."
				this.pairing.statusClass = "ok"
				localStorage.removeItem("bridge_a")
			} catch (e) {
				this.pairing.statusText = "Ошибка создания моста."
				this.pairing.statusClass = "err"
			}
		},

		async onInit(promise) {
			try {
				await promise
			} catch (error) {
				if (error.name === "NotAllowedError") {
					this.error = "ERROR: you need to grant camera access permission"
				} else if (error.name === "NotFoundError") {
					this.error = "ERROR: no camera on this device"
				} else if (error.name === "NotSupportedError") {
					this.error = "ERROR: secure context required (HTTPS, localhost)"
				} else if (error.name === "NotReadableError") {
					this.error = "ERROR: is the camera already in use?"
				} else if (error.name === "OverconstrainedError") {
					this.error = "ERROR: installed cameras are not suitable"
				} else if (error.name === "StreamApiNotSupportedError") {
					this.error = "ERROR: Stream API is not supported in this browser"
				} else if (error.name === "InsecureContextError") {
					this.error =
							"ERROR: Camera access is only permitted in secure context. Use HTTPS or localhost rather than HTTP."
				} else {
					this.error = `ERROR: Camera error (${error.name})`
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

/* Обёртки режима отправки не должны влиять на раскладку: кнопки, поле и файл
   занимают ширину так же, как если бы лежали прямо в .scanner (как в старой версии). */
.sendMode,
.sendBlock {
	display: contents;
}

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
}

.buttonBlock a {
	cursor: pointer;
	width: 100%;
	text-align: center;
}

.file-input {
	width: 50%;
}

.pairStart {
	margin-top: 12px;
	display: flex;
	justify-content: center;
}

.pairing {
	width: 50%;
	margin-top: 12px;
	padding: 12px;
	border: 1px solid rgba(0, 0, 0, 0.15);
	border-radius: 10px;
}

.pairing-title {
	font-weight: 700;
	margin-bottom: 8px;
}

.pairing-hint {
	opacity: 0.75;
	margin-bottom: 8px;
}

.pairing-row {
	display: flex;
	flex-direction: column;
	gap: 6px;
	margin-bottom: 10px;
	font-size: 13px;
	word-break: break-all;
}

.pairing-actions {
	display: flex;
	gap: 10px;
	flex-wrap: wrap;
}

.hint {
	opacity: 0.75;
}

.ok {
	color: #0a7;
	font-weight: 700;
}

.err {
	color: #d44;
	font-weight: 700;
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

	.pairing {
		width: 100%;
	}
}
</style>