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
		console.log('Websocket is listening on ws://localhost:5006/ws');

		wss.on('connection', (ws: any) => {
			console.log('New connection!');

			ws.on('message', (message: any) => {
				const id = uuidv4();

				message = JSON.parse(message);

				const metadata = {
					id: id,
					header: message.header,
					orderId: message.id,
				};
				this.clientsToNotifyOnStateChange.set(ws, metadata);
			});

			ws.on('close', () => {
				console.log('Closed');

				this.clientsToNotifyOnStateChange.delete(ws);
			});
		});
	}

	public static async sendStateChange(id: string) {
		const order: IOrder[] = await this.order.find({ orderId: id });
		const message = JSON.stringify(order);
		if (order) {
			[...this.clientsToNotifyOnStateChange].forEach((client) => {
				let data = client[1];

				if (data.header === 'order' && data.orderId === id) {
					client[0].send(message);
				}
			});
		} else {
			throw Error('Error in database');
		}
	}

	public static async sendStateChangeToDisplay() {
		const order: IOrder[] = await this.order.find(
			{ isFinished: false },
			{ costumerId: 1, orderedTime: 1, orderedProducts: 1 }
		);
		const message = JSON.stringify(order);
		if (order) {
			[...this.clientsToNotifyOnStateChange].forEach((client) => {
				let data = client[1];

				if (data.header === 'display') {
					client[0].send(message);
				}
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
