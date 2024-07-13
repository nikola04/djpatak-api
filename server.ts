import express from 'express'
import mongoose from 'mongoose'
import { Client, Events, GatewayIntentBits } from 'discord.js'
import { createClient } from 'redis';
import playDl from 'play-dl'
import cors from 'cors'
import v1Router from './src/api/v1/route'
import authRouter from './src/auth/route'

// INITIALIZATION
const app = express()
const botClient = new Client({ 
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates
    ] 
})
const redisClient = createClient({
    password: process.env.REDIS_PSWD,
    socket: {
        host: process.env.REDIS_HOST,
        port: Number(process.env.REDIS_PORT)
    }
})
  
app.use(cors({
    origin: process.env.APP_URL,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type'],
}));

// ROUTES
app.use('/api/v1/', v1Router)
app.use('/auth', authRouter)

// EVENTS
console.log("> Starting server...")
app.listen(process.env.PORT, () => 
    console.log('✅', `Listening on http://localhost:${process.env.PORT}/`)
)

botClient.once(Events.ClientReady, readyClient => 
    console.log('✅', `Bot Ready! Logged in as ${readyClient.user.tag}!`)
).login(process.env.DISCORD_CLIENT_TOKEN).catch(err => {
    console.error('❌', 'Bot Connection Error:', err)
})

mongoose.connect(process.env.MONGODB_URI!).then(() => 
    console.log('✅', 'MongoDB Connected!')
).catch((err) => {
    console.error('❌', 'MongoDB Not Connected: ', err)
})

redisClient.connect().then(() => {
    console.log('✅', 'Redis Connected!')
    redisClient.flushDb().then(() => console.log('✅', 'Redis Cleared!'))
    .catch(err => console.error('❌', 'Redis Error while cleaning:', err))
}).catch((err) => {
    console.error('❌', 'Redis Not Connected: ', err)
})
playDl.getFreeClientID().then((clientID: string) => {
    playDl.setToken({
      soundcloud : {
          client_id : clientID
      }
    })
})

export { 
    botClient,
    redisClient
}