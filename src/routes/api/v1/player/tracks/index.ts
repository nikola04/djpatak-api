import { Router } from "express";
import queueRouter from './queue'
import soundCloudRouter from './providers/soundcloud'

// INIT
const router = Router({ mergeParams: true })

// ROUTES

router.use('/queue', queueRouter)
router.use('/soundcloud', soundCloudRouter)

export default router