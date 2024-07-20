import { Router } from "express";
import queueRouter from './queue'
import soundCloudRouter from './providers/soundcloud'

// INIT
const router = Router({ mergeParams: true })

// ROUTES

router.use('/tracks/queue', queueRouter)
router.use('/tracks/soundcloud', soundCloudRouter)

export default router