import { Schema, model } from 'mongoose';
import { IUserSearch } from 'types/user';

const userSearchSchema = new Schema<IUserSearch>({
	userId: {
		type: Schema.Types.ObjectId,
		ref: 'User',
		required: true,
	},
	searchProviders: {
		type: [String],
		required: true,
	},
	search: {
		type: String,
		required: true,
	},
	searchedAt: {
		type: Date,
		default: Date.now,
	},
});

const UserSearchModel = model('userSearches', userSearchSchema);

export default UserSearchModel;
