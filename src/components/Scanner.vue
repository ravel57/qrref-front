<template>
	<div class="scanner">
		<fwb-p style="color: red; margin-top: 15px">{{ error }}</fwb-p>
		<div class="inline-flex rounded-md shadow-sm buttonBlock">
			<a
				@click="isText = true" aria-current="page"
				class="px-4 py-2 text-sm font-medium text-blue-700 bg-white border border-gray-200 rounded-s-lg hover:bg-gray-100 focus:z-10 focus:ring-2 focus:ring-blue-700 focus:text-blue-700 dark:bg-gray-800 dark:border-gray-700 dark:text-white dark:hover:text-white dark:hover:bg-gray-700 dark:focus:ring-blue-500 dark:focus:text-white"
				v-text="'Текст'"
			/>
			<a
				@click="isText = false"
				class="px-4 py-2 text-sm font-medium text-gray-900 bg-white border border-gray-200 rounded-e-lg hover:bg-gray-100 hover:text-blue-700 focus:z-10 focus:ring-2 focus:ring-blue-700 focus:text-blue-700 dark:bg-gray-800 dark:border-gray-700 dark:text-white dark:hover:text-white dark:hover:bg-gray-700 dark:focus:ring-blue-500 dark:focus:text-white"
				v-text="'Файл'"
			/>
		</div>
		<fwb-textarea
			v-if="isText"
			@input="evt => text = evt.target.value"
			:rows="4"
			label="Текст для перессылки"
			placeholder="Write your message..."
		/>
		<fwb-file-input
			class="file-input"
			style="margin: 15px 0 0"
			v-else
			v-model="file"
			label="Файл для перессылки"/>

		<qrcode-stream
			class="qrcode-stream"
			@decode="onDecode"
			@init="onInit"
		/>
	</div>
</template>


<script>
import axios from "axios";
import {QrcodeStream} from 'qrcode-reader-vue3'
import {FwbButton, FwbFileInput, FwbP, FwbTab, FwbTabs, FwbTextarea} from "flowbite-vue";


export default {
	name: 'Scanner',

	components: {
		FwbButton,
		FwbFileInput,
		FwbTab,
		FwbTabs,
		FwbP,
		FwbTextarea,
		QrcodeStream
	},

	data() {
		return {
			isText: true,
			activeTab: 'text',
			scanResult: '',
			file: null,
			error: '',
			text: '',
		}
	},

	computed: {},

	methods: {
		onDecode(scanResult) {
			if (!scanResult.toString().startsWith('http://') || !scanResult.toString().startsWith('https://'))
				scanResult = 'https://' + scanResult
			this.scanResult = scanResult
			let key = new URL(scanResult).searchParams.get('key')
			let text = this.text
			if (this.text) {
				axios.post(`/text/${key}`, text)
					.then(/*response => console.log(response.data)*/)
			}
			if (this.file) {
				let formData = new FormData();
				formData.append('file', this.file);
				axios.post(`/file/${key}`, formData, {
					headers: {
						'Content-Type': 'multipart/form-data'
					}
				})
			}
		},

		async onInit(promise) {
			try {
				await promise
			} catch (error) {
				if (error.name === 'NotAllowedError') {
					this.error = "ERROR: you need to grant camera access permission"
				} else if (error.name === 'NotFoundError') {
					this.error = "ERROR: no camera on this device"
				} else if (error.name === 'NotSupportedError') {
					this.error = "ERROR: secure context required (HTTPS, localhost)"
				} else if (error.name === 'NotReadableError') {
					this.error = "ERROR: is the camera already in use?"
				} else if (error.name === 'OverconstrainedError') {
					this.error = "ERROR: installed cameras are not suitable"
				} else if (error.name === 'StreamApiNotSupportedError') {
					this.error = "ERROR: Stream API is not supported in this browser"
				} else if (error.name === 'InsecureContextError') {
					this.error = 'ERROR: Camera access is only permitted in secure context. Use HTTPS or localhost rather than HTTP.';
				} else {
					this.error = `ERROR: Camera error (${error.name})`;
				}
			}

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
}

</style>
