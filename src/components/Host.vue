<template>
	<div>
		<div class="checkbox">
			<fwb-checkbox v-model="autoUrlAssign" :label="$t('hostAutoOpen')"/>
		</div>
		<fwb-p v-if="session.offline" style="color: #d44; text-align: center; margin-bottom: 10px">
			{{ $t('hostOffline') }}
		</fwb-p>
		<div v-if="session.key">
			<fwb-textarea
					style="margin-bottom: 15px;"
					v-if="text"
					v-model="text"
					:label="$t('hostReceivedText')"
					readonly
			/>
			<img id="qr-img"
					 :src="`/getQr/${session.key}`" alt="qrCode"/>
			<fwb-p class="hint">
				{{ $t('hostQrHint') }}
			</fwb-p>
			<div class="resetKey">
				<fwb-button color="default" size="xs" @click="reset">{{ $t('hostResetKey') }}</fwb-button>
			</div>
		</div>
	</div>
</template>

<script>
import axios from "axios";
import {getText, resetText} from '@/util/ws'
import {resetKey, session} from '@/util/session'
import {FwbButton, FwbCheckbox, FwbP, FwbTextarea} from "flowbite-vue";

export default {
	name: "Host",

	components: {FwbTextarea, FwbP, FwbCheckbox, FwbButton},

	data: () => ({
		session,
		text: '',
		autoUrlAssign: true,
		tickTimer: null,
	}),

	mounted() {
		if (localStorage.autoUrlAssign) {
			this.autoUrlAssign = localStorage.autoUrlAssign === true || localStorage.autoUrlAssign === 'true';
		}

		this.tickTimer = setInterval(() => {
			if (this.text !== getText()) {
				if (getText().startsWith("file/")) {
					this.downloadFile(getText())
				} else {
					this.text = getText()
				}
			}

			if (this.autoUrlAssign === true) {
				this.urlAssign(this.text)
			}
		}, 500)
	},

	beforeUnmount() {
		clearInterval(this.tickTimer)
	},

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

		/** Новый ключ: старый QR перестаёт принимать данные. */
		async reset() {
			this.text = ''
			resetText()
			await resetKey()
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

.hint {
	max-width: 520px;
	opacity: 0.7;
	font-size: 12px;
	text-align: center;
	margin-top: 8px;
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
