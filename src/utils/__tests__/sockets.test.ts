import { clearAllSockets, getSubscribedSockets, subscribeSocket, unsubscribeSocket } from '../sockets';

describe('Sockets', () => {
	const playerId = 'player_id_test';
	const socket1 = '123',
		socket2 = '456',
		socket3 = '789',
		socket4 = '111';
	beforeEach(clearAllSockets)
	it('should unsubscribe sockets', () => {
		subscribeSocket(playerId, socket1);
		expect(getSubscribedSockets(playerId)?.includes(socket1)).toBe(true);
		unsubscribeSocket(socket4);
		expect(getSubscribedSockets(playerId)?.includes(socket1)).toBe(true);
		unsubscribeSocket(socket1);
		expect(getSubscribedSockets(playerId)?.includes(socket1)).toBe(false); // should exist
	});
	it('should subscribe sockets', () => {
		subscribeSocket(playerId, socket1);
		subscribeSocket(playerId, socket2);
		subscribeSocket(playerId, socket4);
		unsubscribeSocket(socket4);
		const subscribedSockets = getSubscribedSockets(playerId);
		expect(subscribedSockets?.includes(socket1)).toBe(true); // should exist
		expect(subscribedSockets?.includes(socket2)).toBe(true); // should exist
		expect(subscribedSockets?.includes(socket3)).toBe(false); // should not exist
		expect(subscribedSockets?.includes(socket4)).toBe(false); // should not exist - unsubscribed
	});
});
