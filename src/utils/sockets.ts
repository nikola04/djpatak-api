import { Server } from 'http'
import { v4 as uuid } from 'uuid'
import { authenticateSocketHandshake } from './authenticate'
import { WebSocket, WebSocketServer } from 'ws'
import { QueueTrack } from '@/classes/queueTrack'

const playerSocketsMap = new Map<string, string[]>()
const socketsMap = new Map<string, WebSocket>()

export function handleSocketServer(httpServer: Server, wss: WebSocketServer){
    httpServer.on('upgrade', (req, socket, head) => {
        const auth = authenticateSocketHandshake(req)
        if(!auth){
            socket.write('HTTP/1.1 401 Unathorized\r\n\r\n')
            socket.destroy()
            return
        }
        const { userId }  = auth
        wss.handleUpgrade(req, socket, head, (ws: WebSocket) => {
            const socketId = uuid()
            ws.socketId = socketId
            socketsMap.set(socketId, ws)
            ws.on('message', (message) => {
                try{
                    const { event, data } = JSON.parse(message.toString())
                    if(event !== 'subscribe' || !data?.playerId) return unsubscribeSocket(socketId)
                    const playerId = data.playerId
                    // TODO # check if user can listen this player
                    subscribeSocket(playerId, socketId)
                }catch(err){
                    console.error(err)
                }
            })
            ws.on('close', () => deleteSocket(socketId))
            wss.emit('connection', ws, req)
        })
    })
}

function sendMessageToPlayerSockets(playerId: string, message: string){
    const socketIds = playerSocketsMap.get(playerId)
    if(!socketIds) return
    socketIds.forEach((socketId) => {
        const socket = socketsMap.get(socketId)
        if(!socket) return
        socket.send(message)
    })
}

function subscribeSocket(playerId: string, socketId: string){
    let playerSockets;
    if(!(playerSockets = playerSocketsMap.get(playerId))) playerSocketsMap.set(playerId, [socketId])
    else playerSocketsMap.set(playerId, [...playerSockets, socketId])
    return socketId
}
function unsubscribeSocket(socketId: string){
    playerSocketsMap.forEach((playerSockets, playerId) => {
        if(playerSockets.includes(socketId)) playerSocketsMap.set(playerId, playerSockets.filter((socket) => socket != socketId))
    })
}

function deleteSocket(socketId: string){
    for(const data of playerSocketsMap){
        if(data[1].includes(socketId)){
            if(data[1].length == 1) playerSocketsMap.delete(data[0])
            else playerSocketsMap.set(data[0], data[1].filter((val) => val != socketId))
            break;
        }
    }
    socketsMap.delete(socketId)
}

type EventType = 'now-playing'|'new-queue-song'|'queue-end'|'pause'|'resume'
export function emitEvent(event: 'now-playing'|'new-queue-song', playerId: string, track: QueueTrack): void;
export function emitEvent(event: Exclude<EventType, 'now-playing'>, playerId: string): void;
export function emitEvent(event: EventType, playerId: string, data?: any): void{
    sendMessageToPlayerSockets(playerId, JSON.stringify({
        event,
        data
    }))
}