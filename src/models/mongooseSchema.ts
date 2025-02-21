import { Schema, SchemaDefinition, model } from 'mongoose';

const userSchema = new Schema<SchemaDefinition>(
	{
		_id: Schema.Types.ObjectId,
		name: {
			type: String,
			required: [true, 'Name is required'],
			unique: [true, 'Username is already taken'],
		},
		password: {
			type: String,
			required: [true, 'Password is required'],
		},
		role: {
			type: String,
			required: [true, 'Role is required'],
			default: 'customer',
		},
		email: {
			type: String,
			required: [true, 'Email is required'],
		},
		profilePicture: {
			type: String,
			default: '',
		},
	},
	{
		versionKey: false,
		id: false,
		toJSON: { virtuals: true },
		toObject: { virtuals: true },
	}
);
export const userModel = model('userId', userSchema, 'users');

const categorySchema = new Schema<SchemaDefinition>(
	{
		_id: Schema.Types.ObjectId,
		name: {
			type: String,
			required: [true, 'Name is required'],
			unique: [true, 'Category name already exists'],
		},
		icon: {
			type: String,
			required: [true, 'Icon is required'],
		},
	},
	{
		versionKey: false,
		id: false,
		toJSON: { virtuals: true },
		toObject: { virtuals: true },
	}
);
export const categoryModel = model('categoryId', categorySchema, 'categories');

const foodSchema = new Schema<SchemaDefinition>(
	{
		_id: Schema.Types.ObjectId,
		name: {
			type: String,
			required: [true, 'Name is required'],
			unique: [true, 'Food name is already taken'],
		},
		materials: [
			{
				name: {
					type: String,
					required: true,
					lowercase: true,
				},
				quantity: {
					type: Number,
					required: true,
				},
			},
		],
		price: {
			type: Number,
			required: [true, 'Price is required'],
		},
		isEnabled: {
			type: Boolean,
			default: true,
		},
		categoryId: [
			{
				type: Schema.Types.ObjectId,
				required: [true, 'Category is required'],
				ref: 'categoryId',
			},
		],
		image: {
			type: String,
			default: 'no-image.svg',
		},
	},
	{
		versionKey: false,
		id: false,
		toJSON: { virtuals: true },
		toObject: { virtuals: true },
	}
);

const materialSchema = new Schema<SchemaDefinition>(
	{
		_id: Schema.Types.ObjectId,
		name: {
			type: String,
			required: [true, 'Name is required'],
			lowercase: true,
			trim: true,
		},
		quantity: {
			type: Number,
			required: [true, 'Quantity is required'],
		},
		message: {
			type: String,
			default: '',
		},
		date: {
			type: Date,
			default: new Date(),
			validate: {
				validator: function (v: Date) {
					return v <= new Date();
				},
				message: 'You cannot specify a date later than the current date!',
			},
		},
	},
	{
		versionKey: false,
		id: false,
		toJSON: { virtuals: true },
		toObject: { virtuals: true },
	}
);
export const materialModel = model('materialId', materialSchema, 'materials');

const unitOfMeasure = new Schema<SchemaDefinition>(
	{
		_id: Schema.Types.ObjectId,
		materialName: {
			type: String,
			required: [true, 'Name is required'],
			unique: [true, 'The material already has a unit of measure'],
			lowercase: true,
			trim: true,
		},
		unit: {
			type: String,
			required: [true, 'Unit of measure is required'],
		},
	},
	{
		versionKey: false,
		id: false,
		toJSON: { virtuals: true },
		toObject: { virtuals: true },
	}
);

const orderSchema = new Schema<SchemaDefinition>(
	{
		_id: Schema.Types.ObjectId,
		costumerId: {
			type: Schema.Types.ObjectId,
			required: [true, 'Customer is required'],
			ref: 'userId',
		},
		orderedTime: {
			type: Date,
			default: Date.now(),
			validate: {
				validator: function (v: Date) {
					return v <= new Date();
				},
				message: 'You cannot specify a date later than the current date!',
			},
		},
		finishedCokingTime: {
			type: Date,
			validate: {
				validator: function (v: Date) {
					return v <= new Date();
				},
				message: 'You cannot specify a date later than the current date!',
			},
		},
		finishedTime: {
			type: Date,
			validate: {
				validator: function (v: Date) {
					return v >= new Date();
				},
				message: 'You cannot specify a date earlier than the current date!',
			},
		},
		orderedProducts: [
			{
				name: {
					type: String,
					required: true,
					lowercase: true,
					trim: true,
				},
				quantity: {
					type: Number,
					required: true,
				},
			},
		],
		orderNumber: {
			type: Number,
			required: [true, 'Order number is required'],
		},
	},
	{
		versionKey: false,
		id: false,
		toJSON: { virtuals: true },
		toObject: { virtuals: true },
	}
);

export const foodModel = model('foodId', foodSchema, 'foods');
export const orderModel = model('orderId', orderSchema, 'orders');

export const unitOfMeasureModel = model(
	'unitId',
	unitOfMeasure,
	'unitOfMeasures'
);
