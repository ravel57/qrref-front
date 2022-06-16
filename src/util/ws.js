import SockJS from 'sockjs-client'
import {Stomp} from '@stomp/stompjs'


var stompClient = null

export function connect() {
    const socket = new SockJS('/websocket')
    stompClient = Stomp.over(socket)
    stompClient.connect({}, () => {
        stompClient.subscribe('/topic/activity', message => callback(message))
    })
}


function callback(message) {
    let m = JSON.parse(message.body)
    let element = document.getElementById("messages")
    if (element) {
        console.log(m)
    }
}


export function disconnect() {
    if (stompClient !== null) {
        stompClient.disconnect()
    }
    console.log("Disconnected")
}

export function sendMessage(message) {
    // console.log(message)
    stompClient.send("/app/changeMessage", {}, JSON.stringify(message))
}

export function sendTask(task) {
    stompClient.send("/app/changeTask", {}, JSON.stringify(task))
}

export function sendClient(client) {
    console.log(client)
    stompClient.send("/app/changeClient", {}, JSON.stringify(client))
}