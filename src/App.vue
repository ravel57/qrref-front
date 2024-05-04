<template>
	<div class="main">
		<div class="container">
			<div class="toggle">
				<fwb-toggle @click.stop="switchTheme" label="Темная тема"/>
			</div>
			<div class="chosenBoard">
				<div class="inline-flex rounded-md shadow-sm" role="group">
					<fwb-button class="menuBtn" style="width: 100%" @click="isScannerMode = false" color="default">Прием</fwb-button>
					<fwb-button class="menuBtn" @click="isScannerMode = true" color="default">Отправка</fwb-button>
				</div>
			</div>
			<Host v-if="!isScannerMode"/>
			<Scanner v-else/>
		</div>
	</div>
</template>


<script>
import {connect} from '@/util/ws'
import Scanner from "@/components/Scanner.vue"
import Host from "@/components/Host.vue"
import {FwbButton, FwbToggle} from "flowbite-vue";

connect()

export default {
	components: {
		Scanner,
		Host,
		FwbButton,
		FwbToggle

	},
	data() {
		return {
			processing: true,
			activeTab: 'host',
			darkTheme: false,
			isScannerMode: false
		}
	},

	mounted() {
		this.isScannerMode = this.isMobile
	},

	methods: {
		switchTheme() {
			// Toggle на @click отправляет 2 события click за себя и за label
			this.processing = !this.processing
			if (this.processing){
				this.darkTheme = !this.darkTheme
				if (this.darkTheme) {
					document.documentElement.classList.add('dark')
					document.getElementsByTagName("body")[0].style.backgroundColor = '#202127'
				} else {
					document.documentElement.classList.remove('dark')
					document.getElementsByTagName("body")[0].style.backgroundColor = '#ffffff'
				}
			}
		},
	},

	computed: {
		isMobile() {
			return (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent))
		}
	}

}
</script>


<style scoped>
.main {
	padding: 20px;
	display: flex;
	align-items: center;
	flex-direction: column;
}

.container {
	width: 50%;
	display: flex;
	align-items: center;
	flex-direction: column;
}

.chosenBoard {
	width: 30vw;
	height: 50px;
	display: flex;
	justify-content: center;
}

.menuBtn {
	margin-left: 10px;
	min-width: 100px;
	width: 100%;
	height: 100%;
}

.toggle {
	display: block;
	align-items: end;
	margin-bottom: 15px;
}
</style>