import { Repeat } from 'types/player';

export const isRepeat = (value: unknown): value is Repeat => {
	return value === 'track' || value === 'queue' || value === 'off';
};
