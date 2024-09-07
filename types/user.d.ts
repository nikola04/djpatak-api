import { TrackProvider } from '@/enums/providers';

export interface IUser {
	_id: Schema.Types.ObjectId;
	name: string;
	email: string;
	image: string;
}

export interface IUserSearch {
	_id: Schema.Types.ObjectId;
	userId: Schema.Types.ObjectId;
	searchProviderId: TrackProvider;
	search: string;
	searchedAt: Date;
}
