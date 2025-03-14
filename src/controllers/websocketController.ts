import { IOrder, IUser } from '../models/models';

import { orderModel, userModel } from '../models/mongooseSchema';
import { generateToken, generateUUID4Token } from '../services/tokenService';

const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 5006 });
export default class webSocetController {
	static clientsToNotifyOnStateChange = new Map();
	static sendAdminLogin = new Map();
	static kitchen: any[] = [];
	static display: any[] = [];
	static salesman: any[] = [];

	private static order = orderModel;

	// ws://localhost:5006/ws
	public static init(): void {
		console.log('Websocket is listening on ws://localhost:5006/ws');

		wss.on('connection', (ws: any) => {
			console.log('New connection!');

			ws.on('message', (message: any) => {
				const id = generateUUID4Token();
				message = JSON.parse(message);

				if (message.token) {
					this.sendAdminLogin.set(message.token, ws);
				} else if (message.role == 'kitchen') {
					this.kitchen.push(ws);
				} else if (message.header === 'display') {
					this.display.push(ws);
				} else if (message.header === 'salesman') {
					this.salesman.push(ws);
				} else {
					const metadata = {
						id: id,
						header: message.header,
						orderId: message.id,
					};
					this.clientsToNotifyOnStateChange.set(ws, metadata);
				}
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

	public static async sendStateChangeToAdmins(user: any) {
		for (const [token, ws] of this.sendAdminLogin.entries()) {
			if (token === user.WebSocketToken) {
				const databaseUser: IUser | null = await userModel.findOne({
					_id: user.user._id,
				});
				if (databaseUser) {
					const token: string = await generateToken(databaseUser);
					console.log(
						`User ${databaseUser.name} logged in (${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()})`
					);
					ws.send(
						JSON.stringify({
							token: token,
							role: databaseUser.role,
							profilePicture: databaseUser.profilePicture,
							userId: databaseUser._id,
						})
					);
					this.sendAdminLogin.delete(token);
				}
			}
		}
	}
	public static async sendStateChangeToSalesman(changedOrder: IOrder) {
		const message = JSON.stringify(changedOrder);
		for (const ws of this.salesman) {
			ws.send(message);
		}
		this.sendStateChangeToDisplay(changedOrder);
	}
	public static async sendStateChangeToKitchen(changedOrder: IOrder) {
		const message = JSON.stringify(changedOrder);
		for (const ws of this.kitchen) {
			ws.send(message);
		}
		this.sendStateChangeToDisplay(changedOrder);
	}
	public static async sendStateChangeToDisplay(changedOrder: IOrder) {
		const message = JSON.stringify(changedOrder);
		for (const ws of this.display) {
			ws.send(message);
		}
	}
}
