import { createStore } from 'vuex'

export default createStore({
    state: {
        key: ''
    },

    mutations: {
        saveKey: (state, payload) =>{
            alert("123321")
            state.key = payload
        },
    },

    actions: {

    },

    getters: {
        key: state => {
            return state.key
        },
    }
})
