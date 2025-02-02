import { Router, Request, Response } from 'express';

interface IUser {
	_id: string;
	name: string;
	password: string;
	role: string | undefined;
	email: string | undefined;
	token: string | undefined;
}

interface ICategory {
	_id: string;
	name: string;
	icon: string;
}

interface IMaterial {
	_id: string;
	name: string;
	quantity: number;
	message: string;
}

interface IUnit {
	_id: string;
	materialName: string;
	unit: string;
}

interface IFood {
	_id: string;
	material: IFoodMaterial[];
	price: number;
	name: string;
	isEnabled: boolean;
	category: string | undefined;
}

interface IFoodMaterial {
	name: string;
	quantity: number;
}
interface IOrder {
	_id?: string;
	costumerID: string;
	isFinished: boolean;
	finishedTime: Date;
	orderedTime: Date;
	finishedCokingTime: Date;
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

export {
	IUser,
	IMaterial,
	IController,
	IFood,
	getRawId,
	getObjectID,
	IOrder,
	IUnit,
};
