import { Schema, model } from 'mongoose';
import { IToken } from 'types/token';

const tokenSchema = new Schema<IToken>({
	userId: {
		type: Schema.Types.ObjectId,
		ref: 'User',
		required: true,
	},
	refreshToken: {
		type: String,
		required: true,
	},
	expiresAt: {
		type: Number,
		default: () => Date.now() + 15811200000, // 6 months
	},
});

const TokenModel = model('tokens', tokenSchema);

export default TokenModel;
