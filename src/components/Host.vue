<template>
	<div>
		<div class="checkbox">
			<fwb-checkbox v-model="autoUrlAssign" label="Авто переход по ссылке" />
		</div>
		<div v-if="key !== String">
			<div class="result" v-if="text">
				<p class="decode-result"
				   v-text="'Полученный текст:'"/>
				<p class="decode-result"
				   v-text="text"/>
			</div>
			<img id="qr-img"
				 :src="'/getQr/'+key" alt="qrCode"/>
		</div>
	</div>
</template>


<script>
import axios from "axios";
import {connect, getText, disconnect, resetText} from '@/util/ws'
import {FwbCheckbox, FwbImg} from "flowbite-vue";

export default {
	// eslint-disable-next-line vue/multi-word-component-names
	name: "Host",
	components: {FwbCheckbox, FwbImg},

	data() {
		return {
			key: String,
			text: String,
			autoUrlAssign: true,
		}
	},

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
				this.text = getText()
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
.checkbox{
	display: flex;
	align-items: center;
	justify-content: center;
	margin-top: 15px;
	margin-bottom: 15px;
}

.decode-result {
	margin: 5px;
	font-size: 24px;
}

.text {
	font-size: 17px;
}
</style>
