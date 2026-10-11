import { createApp } from 'vue'
import App from './App.vue'
import VueApexCharts from "vue3-apexcharts";
import './assets/index.css'
import i18n from '@/util/i18n'

createApp(App)
	.use(VueApexCharts)
	.use(i18n)
	.mount('#app')
