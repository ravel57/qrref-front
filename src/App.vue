<template>
	<div class="main">
		<div class="container">
			<div class="toggle">
				<fwb-toggle v-model="darkTheme" :label="$t('darkTheme')"/>
			</div>
			<div class="chosenBoard" v-if="!session.roomId">
				<div class="inline-flex rounded-md shadow-sm" role="group">
					<fwb-button class="menuBtn" :class="{active: scannerMode === ScannerMode.HOST}"
											:aria-pressed="scannerMode === ScannerMode.HOST" @click="scannerMode = ScannerMode.HOST" color="default">
						{{ $t('modeReceive') }}
					</fwb-button>
					<fwb-button class="menuBtn" :class="{active: scannerMode === ScannerMode.SCANNER}"
											:aria-pressed="scannerMode === ScannerMode.SCANNER" @click="scannerMode = ScannerMode.SCANNER" color="default">
						{{ $t('modeSend') }}
					</fwb-button>
				</div>
			</div>
			<!-- Чат открывается поверх любого режима, пока устройство связано с другим -->
			<Chat v-if="session.roomId"/>
			<Host v-else-if="scannerMode === ScannerMode.HOST"/>
			<Scanner v-else/>
		</div>
	</div>
</template>


<script lang="ts">
import {session, startSession} from '@/util/session'
import Scanner from "@/components/Scanner.vue"
import Host from "@/components/Host.vue"
import Chat from "@/components/Chat.vue"
import {FwbButton, FwbToggle} from "flowbite-vue";

enum ScannerMode {
	HOST,
	SCANNER,
}

export default {
	components: {
		Chat,
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
		session,
	}),

	mounted() {
		startSession()
		this.switchTheme()
		const params = new URLSearchParams(window.location.search)
		const hasKey = (params.get('key') || '').trim().length > 0
		// Открыли по ссылке из QR (камерой телефона) или зашли с телефона — сразу «Отправка».
		this.scannerMode = (hasKey || this.isMobile) ? ScannerMode.SCANNER : ScannerMode.HOST
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
	width: 100%;
	display: flex;
	justify-content: center;
	margin-bottom: 12px;
}

.menuBtn {
	margin-left: 10px;
	min-width: 100px;
	width: 100%;
	height: 100%;
	white-space: normal;
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