<template>
	<div>
		<div class="checkbox">
			<fwb-checkbox v-model="autoUrlAssign" label="Авто переход по ссылке"/>
		</div>
		<fwb-p v-if="offline" style="color: #d44; text-align: center; margin-bottom: 10px">
			Нет соединения с сервером (WebSocket): текст и файлы не придут.
		</fwb-p>
		<div v-if="key !== String">
			<fwb-textarea
					style="margin-bottom: 15px;"
					v-if="text"
					@input="text"
					v-model="text"
					label="Полученный текст"
					readonly
			/>
			<img id="qr-img"
					 :src="`/getQr/${key}`" alt="qrCode"/>
			<div class="resetKey">
				<fwb-button color="default" size="xs" @click="resetKey">Сбросить ключ</fwb-button>
			</div>
		</div>
	</div>
</template>

<script>
import axios from "axios";
import {connect, getText, disconnect, resetText} from '@/util/ws'
import {FwbButton, FwbCheckbox, FwbImg, FwbP, FwbTextarea} from "flowbite-vue";
import fs from 'fs/promises';

export default {
	name: "Host",

	components: {FwbTextarea, FwbP, FwbCheckbox, FwbImg, FwbButton},

	emits: ['paired'],

	data: () => ({
		key: String,
		text: String,
		autoUrlAssign: true,
		offline: false,
		offlineTimer: null,
		tickTimer: null,
	}),

	mounted() {
		if (localStorage.autoUrlAssign) {
			this.autoUrlAssign = localStorage.autoUrlAssign;
		}
		let timer = new Date() - 30000

		this.tickTimer = setInterval(() => {
			let dif = Math.round((new Date() - timer))
			if (dif >= 30000) {
				timer = new Date()
				this.updateKey()
			}
			if (this.text !== getText()) {
				if (getText().startsWith("file/")) {
					this.downloadFile(getText())
				} else {
					this.text = getText()
				}
				setTimeout(() => {
				}, 3000)
				this.updateKey()
			}

			if (this.autoUrlAssign === true) {
				this.urlAssign(this.text)
			}

		}, 500)
	},

	beforeUnmount() {
		// Без этого таймер переживал смену вкладки и каждые 30 секунд подменял обработчики сокета в «Обмене».
		clearInterval(this.tickTimer)
		clearTimeout(this.offlineTimer)
		disconnect()
	},

	computed: {},

	methods: {
		async downloadFile(url) {
			axios({
				url: `/${url}`,
				method: 'GET',
				responseType: 'blob'
			})
					.then(response => {
						const contentDisposition = response.headers['content-disposition']
						let filename = 'default-filename.jpg'; // Значение по умолчанию
						if (contentDisposition) {
							const filenameMatch = contentDisposition.match(/filename="?([^";]+)"?/);
							if (filenameMatch && filenameMatch[1]) {
								filename = filenameMatch[1]; // Используем найденное имя файла
							}
						}

						// Создаем URL из полученного Blob
						const url = window.URL.createObjectURL(response.data);
						// Создаем ссылку для скачивания
						const link = document.createElement('a');
						link.href = url;
						link.setAttribute('download', filename); // Устанавливаем имя файла
						document.body.appendChild(link);
						link.click();

						// Очистка после скачивания
						window.URL.revokeObjectURL(url);
						document.body.removeChild(link);
					})
					.catch(error => {
						console.log('Error downloading file:', error);
					});
			resetText()
		},
		/** Первое подключение и короткие обрывы не пугают: предупреждаем через 5 секунд. */
		setOnline(online) {
			clearTimeout(this.offlineTimer)
			if (online) {
				this.offline = false
			} else {
				this.offlineTimer = setTimeout(() => (this.offline = true), 5000)
			}
		},

		/**
		 * Подключение к сокету. Если этот компьютер сопрягли с другим (QR со вкладки «Прием» отсканировали
		 * в режиме bridge), сервер присылает roomId, и мы сообщаем наверх — App открывает вкладку с чатом.
		 */
		connectSocket() {
			connect(this.key, {
				onStatus: online => this.setOnline(online),
				onBridge: roomId => this.$emit('paired', roomId),
			})
		},

		/** Новый ключ: старый QR перестаёт принимать данные. */
		resetKey() {
			axios.post('/resetKey').then(response => {
				this.key = response.data
				this.text = ''
				resetText()
				disconnect()
				this.connectSocket()
			})
		},

		updateKey() {
			axios.get('/getKey').then(response => {
				this.key = response.data
				this.connectSocket()
			})
		},

		urlAssign(text) {
			try {
				new URL(text)
				resetText()
				window.open(text, '_blank').focus()
				// eslint-disable-next-line no-empty
			} catch {
			}
		}
	},

	watch: {
		autoUrlAssign(val) {
			localStorage.autoUrlAssign = val;
		}
	}

}
</script>


<style scoped>
#qr-img {
	/*height: 75vh;*/
}

.resetKey {
	display: flex;
	justify-content: center;
	margin-top: 10px;
}

.checkbox {
	display: flex;
	align-items: center;
	justify-content: center;
	margin-top: 15px;
	margin-bottom: 15px;
}

.result {
	padding: 5px;
	background-color: #333231;
	border-radius: 10px;
	text-align: center;
	margin-top: 10px;
	margin-bottom: 10px;
}

.decode-result {
	margin: 5px;
	font-size: 24px;
}
</style>
