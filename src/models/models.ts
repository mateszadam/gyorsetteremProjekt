import { Router, Request, Response } from 'express';

interface User {
	_id: string;
	name: string;
	password: string;
	role: string | undefined;
	email: string | undefined;
	token: string | undefined;
}

interface Material {
	_id: string;
	name: string;
	quantity: number;
	message: string;
}

interface Food {
	_id: string;
	material: FoodMaterial[];
	price: number;
	name: string;
}

interface FoodMaterial {
	name: string;
	quantity: number;
}
interface Order {
	_id?: string;
	costumerID: string;
	isFinished: boolean;
	orderedTime: Date;
	finishedCokingTime: Date;
	finishedTime: Date;
	orderedProducts: {
		name: string;
		quantity: number;
	}[];
}
interface IController {
	router: Router;
	endPoint: String;
}

function getRawId(id: string) {
	return id.toString().replace('new ObjectId(', '').replace(')', '');
}

function getObjectID(id: string) {
	return 'ObjectId(' + id + ')';
}

class defaultAnswers {
	static async ok(res: Response, message: string = '') {
		if (message == '') {
			res.sendStatus(200);
		} else {
			res.status(200).json({ message });
		}
	}

	static async created(res: Response) {
		res.sendStatus(201);
	}

	static async notAuthorized(res: Response) {
		res.sendStatus(401);
	}

	static async notFound(res: Response) {
		res.sendStatus(404);
	}
	static async notImplemented(res: Response) {
		res.sendStatus(501);
	}
	static async badRequest(res: Response, message: string = '') {
		if (message == '') {
			res.sendStatus(400);
		} else {
			res.status(400).json({ message: message });
		}
	}
}

export {
	User,
	Material,
	IController,
	Food,
	getRawId,
	getObjectID,
	defaultAnswers,
	Order,
};
