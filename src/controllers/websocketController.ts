import { IOrder } from '../models/models';
import { v4 as uuidv4 } from 'uuid';
import { orderModel } from '../models/mongooseSchema';

const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 5006 });
export default class webSocetController {
	static clientsToNotifyOnStateChange = new Map();
	private static order = orderModel;

	// ws://localhost:5006/ws
	public static init(): void {
		wss.on('connection', (ws: any) => {
			const id = uuidv4();
			const metadata = { id };
			console.log(ws.header);

			console.log('New connection!');

			this.clientsToNotifyOnStateChange.set(ws, metadata);

			ws.on('close', () => {
				console.log('Closed');

				this.clientsToNotifyOnStateChange.delete(ws);
			});
		});
	}

	public static async sendStateChange() {
		const order: IOrder[] = await this.order.find(
			{ isFinished: false },
			{ 'orderedProducts._id': 0 }
		);
		console.log(order);
		const message = JSON.stringify(order);
		if (order) {
			[...this.clientsToNotifyOnStateChange.keys()].forEach((client) => {
				client.send(message);
			});
		} else {
			throw Error('Error in database');
		}
	}

	public uuidv4() {
		return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(
			/[xy]/g,
			function (c) {
				var r = (Math.random() * 16) | 0,
					v = c == 'x' ? r : (r & 0x3) | 0x8;
				return v.toString(16);
			}
		);
	}
}
