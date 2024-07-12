import { Router } from "express";
import tracksRoute from './tracks/'
import playerRoute from './player/'

// INIT
const router = Router()

// ROUTES
router.use('/tracks', tracksRoute)
router.use('/player', playerRoute)

export default router