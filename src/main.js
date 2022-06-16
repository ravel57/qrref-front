import { createApp } from 'vue'
// import { createStore } from 'vuex'
import App from './App.vue'
import { connect } from './util/ws'

connect()

/*const app  = */createApp(App).mount('#app')
