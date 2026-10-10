<template>
	<div class="main">
		<div class="container">
			<div class="toggle">
				<fwb-toggle v-model="darkTheme" label="Темная тема"/>
			</div>
			<div class="chosenBoard">
				<div class="inline-flex rounded-md shadow-sm" role="group">
					<fwb-button class="menuBtn" style="width: 100%" :class="{active: scannerMode === ScannerMode.HOST}"
					:aria-pressed="scannerMode === ScannerMode.HOST" @click="scannerMode = ScannerMode.HOST" color="default">
						Прием
					</fwb-button>
					<fwb-button class="menuBtn" :class="{active: scannerMode === ScannerMode.SCANNER}"
					:aria-pressed="scannerMode === ScannerMode.SCANNER" @click="scannerMode = ScannerMode.SCANNER" color="default">
						Отправка
					</fwb-button>
					<fwb-button class="menuBtn" :class="{active: scannerMode === ScannerMode.EXCHANGE}"
					:aria-pressed="scannerMode === ScannerMode.EXCHANGE" @click="scannerMode = ScannerMode.EXCHANGE" color="default">
						Обмен
					</fwb-button>
				</div>
			</div>
			<Host v-if="scannerMode === ScannerMode.HOST" @paired="scannerMode = ScannerMode.EXCHANGE"/>
			<Scanner v-else-if="scannerMode === ScannerMode.SCANNER"/>
			<Exchange v-else-if="scannerMode === ScannerMode.EXCHANGE"/>
		</div>
	</div>
</template>


<script lang="ts">
import {connect} from '@/util/ws'
import Scanner from "@/components/Scanner.vue"
import Host from "@/components/Host.vue"
import {FwbButton, FwbToggle} from "flowbite-vue";
import Exchange from "@/components/Exchange.vue";

enum ScannerMode {
	HOST,
	SCANNER,
	EXCHANGE,
}

export default {
	components: {
		Exchange,
		Scanner,
		Host,
		FwbButton,
		FwbToggle
	},

	data: () => ({
		activeTab: 'host',
		darkTheme: localStorage.getItem('darkTheme') === "true",
		scannerMode: ScannerMode.HOST,
		ScannerMode,
	}),

	mounted() {
		connect()
		this.switchTheme()
		const params = new URLSearchParams(window.location.search)
		const hasKey = (params.get('key') || '').trim().length > 0
		if (hasKey) {
			this.scannerMode = this.isMobile ? ScannerMode.SCANNER : ScannerMode.EXCHANGE
		} else {
			this.scannerMode = this.isMobile ? ScannerMode.SCANNER : ScannerMode.HOST
		}
	},

	methods: {
		switchTheme() {
			if (this.darkTheme) {
				document.documentElement.classList.add('dark')
				document.getElementsByTagName("body")[0].style.backgroundColor = '#202127'
			} else {
				document.documentElement.classList.remove('dark')
				document.getElementsByTagName("body")[0].style.backgroundColor = '#ffffff'
			}
		},
	},

	watch: {
		darkTheme(newVal, oldVal) {
			localStorage.setItem('darkTheme', newVal)
			this.switchTheme()
		}
	},

	computed: {
		isMobile() {
			return (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent))
		}
	},

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

/* Кнопка активного режима темнее остальных (в обеих темах) */
.menuBtn.active {
	background-color: #1e3a8a;
	color: #fff;
	box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.18);
}

.toggle {
	display: block;
	align-items: end;
	margin-bottom: 15px;
}
</style>