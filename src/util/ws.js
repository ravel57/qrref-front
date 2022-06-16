import SockJS from 'sockjs-client'
import {Stomp} from '@stomp/stompjs'
// import store from '@/store/index'


var stompClient = null

export function connect() {
    const socket = new SockJS('/websocket')
    stompClient = Stomp.over(socket)
    stompClient.connect({}, () => {
        stompClient.subscribe('/topic/activity', message => callback(message))
    })
}


function callback(message) {
    console.log(JSON.parse(message.body))
    // console.log(store.getters.key)
    // if (store.getters.key == JSON.parse(message.body).key)
    //     alert(message.body)
}


export function disconnect() {
    if (stompClient !== null) {
        stompClient.disconnect()
    }
    console.log("Disconnected")
}
