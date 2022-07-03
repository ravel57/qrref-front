import SockJS from 'sockjs-client'
import {Stomp} from '@stomp/stompjs'


let text = ''

let stompClient = null

export function connect(key) {
    const socket = new SockJS('/websocket')
    stompClient = Stomp.over(socket)
    stompClient.connect({}, () => {
        stompClient.subscribe('/topic/activity/' + key, message => callback(message))
    })
}


function callback(message) {
    text = message.body
}

export function getText(){
    return text
}


export function disconnect() {
    if (stompClient !== null) {
        stompClient.disconnect()
    }
    console.log("Disconnected")
}
