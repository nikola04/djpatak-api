export interface IToken {
	_id: Schema.Types.ObjectId;
	userId: Schema.Types.ObjectId;
	refreshToken: string;
	expiresAt: number;
}
