import express from 'express';
import cors from 'cors';
import v1Router from '@/routes/api/v1';
import authRouter from '@/routes/auth';

const app = express();

app.use(
	cors({
		origin: process.env.APP_URL,
		methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
		allowedHeaders: ['Content-Type', 'Access-Control-Allow-Origin'],
		credentials: true,
	})
);

// ROUTES
app.use('/api/v1/', v1Router);
app.use('/auth', authRouter);

export default app