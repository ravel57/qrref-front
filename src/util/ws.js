import SockJS from "sockjs-client/dist/sockjs"
import {Stomp} from '@stomp/stompjs'


let text = ''

let stompClient = null

export function connect() {
    stompClient = Stomp.over(function(){
        return new SockJS('http://localhost:8080/websocket')
    })
    stompClient.debug = function() {}
    stompClient.reconnect_delay = 5000
    stompClient.connect({}, () => {
        stompClient.subscribe('/topic/activity/', message => callback(message))
    })
}


function callback(message) {
    text = message.body
}

export function getText() {
    return text
}

export function resetText() {
    text = ''
}


export function disconnect() {
    if (stompClient !== null) {
        stompClient.disconnect()
    }
}
