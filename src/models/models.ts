import { Router } from 'express';
import { ObjectId } from 'mongodb';

interface IUser {
	_id: ObjectId;
	name: string;
	password: string;
	role: string;
	profilePicture: String;
	email: string | undefined;
}

interface ICategory {
	_id: ObjectId;
	name: string;
	icon: string;
}

interface IMaterial {
	_id: ObjectId;
	name: string;
	quantity: number;
	message: string;
}

interface IUnit {
	_id: ObjectId;
	materialName: string;
	unit: string;
}

interface IFood {
	_id: ObjectId;
	material: IFoodMaterial[];
	price: number;
	name: string;
	isEnabled: boolean;
	categoryId: string | undefined;
}

interface IFoodMaterial {
	_id: ObjectId;
	name: string;
	quantity: number;
}
interface IOrder {
	_id: ObjectId;
	costumerId: string;
	finishedTime: Date | undefined;
	orderedTime: Date;
	finishedCokingTime: Date | undefined;
	orderedProducts: IOrderedProducts[];
}
interface IController {
	router: Router;
	endPoint: String;
}

interface IOrderedProducts {
	name: string;
	quantity: number;
}

export { IUser, IMaterial, IController, IFood, IOrder, IUnit, ICategory };
