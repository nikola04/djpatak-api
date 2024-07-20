import { Router } from "express";
import tracksRoute from './tracks'
import playerRoute from './player'
import usersRoute from './user'
import { authenticate } from '../../../middlewares/authenticate'
import cookieParser from "cookie-parser";

// INIT
const router = Router()

router.use(cookieParser())
router.use(authenticate())

// ROUTES
router.use('/tracks', tracksRoute)
router.use('/player', playerRoute)
router.use('/users', usersRoute)

export default router