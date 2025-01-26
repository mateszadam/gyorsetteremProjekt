import express from 'express';
import mongoose from 'mongoose';
import { IController } from './models/models';
import {
	foodModel,
	materialModel,
	orderModel,
	userModel,
} from './models/mongooseSchema';
import morgan from 'morgan';
import cors from 'cors';

export default class App {
	public app: express.Application;

	constructor(controllers: IController[]) {
		this.app = express();
		this.connectToTheDatabase();
		this.app.use(express.json());
		this.app.use(cors());
		this.app.use(morgan('dev'));
		controllers.forEach((controller) => {
			this.app.use(`${controller.endPoint}`, controller.router);
		});
	}

	public listen(): void {
		this.app.listen(5005, () => {
			console.log('App listening on the port 5005');
		});
	}

	private connectToTheDatabase() {
		mongoose.set('strictQuery', true);
		mongoose
			.connect(
				'mongodb+srv://m001-student:m001-student@main.0030e.mongodb.net/loginService'
			)
			.catch(() =>
				console.log('Unable to connect to the server. Please start MongoDB.')
			);

		mongoose.connection.on('error', (error) => {
			console.log(`Mongoose error message: ${error.message}`);
		});
		mongoose.connection.on('connected', () => {
			console.log('Connected to MongoDB server.');
			this.listen();
		});
		userModel.init();
		foodModel.init();
		orderModel.init();
		materialModel.init();
	}
}

new App([]);
