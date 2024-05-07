<template>
	<div>
		<div class="checkbox">
			<fwb-checkbox v-model="autoUrlAssign" label="Авто переход по ссылке"/>
		</div>
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
		</div>
	</div>
</template>

<script>
import axios from "axios";
import {connect, getText, disconnect, resetText} from '@/util/ws'
import {FwbCheckbox, FwbImg, FwbP, FwbTextarea} from "flowbite-vue";
import fs from 'fs/promises';

export default {
	name: "Host",

	components: {FwbTextarea, FwbP, FwbCheckbox, FwbImg},

	data: () => ({
		key: String,
		text: String,
		autoUrlAssign: true,
	}),

	mounted() {
		if (localStorage.autoUrlAssign) {
			this.autoUrlAssign = localStorage.autoUrlAssign;
		}
		let timer = new Date() - 30000

		setInterval(() => {
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
					console.log(response.headers);
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
		updateKey() {
			axios.get('/getKey').then(response => {
				this.key = response.data
				disconnect()
				connect(this.key)
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
