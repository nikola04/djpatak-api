import { Router } from "express";
import tracksRoute from './tracks/'
import playerRoute from './player/'
import usersRoute from './user/'
import { authenticate } from "../../utils/authenticate";
import cookieParser from "cookie-parser";

// INIT
const router = Router()

router.use(cookieParser())
router.use(authenticate())

// ROUTES
router.use('/tracks', tracksRoute)
router.use('/player', playerRoute)
router.use('/user', usersRoute)

export default router