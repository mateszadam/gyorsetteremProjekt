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
			unique: [true, 'Email is already taken'],
		},
		profilePicture: {
			type: String,
			default: '',
		},
		registeredAt: {
			type: Date,
			validate: {
				validator: function (v: Date) {
					return v <= new Date(Date.now() + 1 * 60 * 60 * 1000);
				},
				message: 'You cannot specify a date later than the current date!',
			},
			default: new Date(Date.now() + 1 * 60 * 60 * 1000),
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
			trim: true,
		},
		englishName: {
			type: String,
			required: [true, 'English name is required'],
			trim: true,
			default: '',
		},
		icon: {
			type: String,
			required: [true, 'Icon is required'],
		},
		mainCategory: {
			type: Schema.Types.ObjectId,
			default: true,
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
			trim: true,
		},
		englishName: {
			type: String,
			required: [true, 'English name is required'],
			trim: true,
			default: '',
		},
		materials: [
			{
				_id: {
					type: Schema.Types.ObjectId,
					required: true,
					ref: 'materialId',
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
		categoryId: {
			type: Schema.Types.ObjectId,
			required: [true, 'Category is required'],
			ref: 'categoryId',
		},
		subCategoryId: [
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
		isDeleted: {
			type: Boolean,
			default: false,
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
			unique: [true, 'Material name already exists'],
		},
		englishName: {
			type: String,
			required: [true, 'English name is required'],
			lowercase: true,
			trim: true,
		},
		unit: {
			type: String,
			required: [true, 'Unit is required'],
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

const materialChangeSchema = new Schema<SchemaDefinition>(
	{
		_id: Schema.Types.ObjectId,
		materialId: {
			type: Schema.Types.ObjectId,
			index: true,
			required: [true, 'Material is required'],
		},
		quantity: {
			type: Number,
			required: [true, 'Quantity is required'],
		},
		message: {
			type: String,
			default: '',
			trim: true,
		},
		date: {
			type: Date,
			validate: {
				validator: function (v: Date) {
					return v <= new Date(Date.now() + 1 * 60 * 60 * 1000) || v === null;
				},
				message: 'You cannot specify a date later than the current date!',
			},
			default: new Date(Date.now() + 1 * 60 * 60 * 1000),
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
			default: Date.now() + 1 * 60 * 60 * 1000,
			validate: {
				validator: function (v: Date) {
					return v <= new Date(Date.now() + 1 * 60 * 60 * 1000);
				},
				message: 'You cannot specify a date later than the current date!',
			},
		},
		totalPrice: {
			type: Number,
			required: [true, 'Total price is required'],
			min: [0, 'Price cannot be negative'],
		},
		finishedCokingTime: {
			type: Date,
			validate: {
				validator: function (v: Date) {
					return v <= new Date(Date.now() + 1 * 60 * 60 * 1000) || v === null;
				},
				message: 'You cannot specify a date later than the current date!',
			},
			default: null,
		},
		finishedTime: {
			type: Date,
			validate: {
				validator: function (v: Date) {
					return v <= new Date(Date.now() + 1 * 60 * 60 * 1000) || v === null;
				},
				message: 'You cannot specify a date later than the current date!',
			},
			default: null,
		},
		orderedProducts: [
			{
				_id: {
					type: Schema.Types.ObjectId,
					required: true,
					ref: 'foodId',
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

export const materialChangeModel = model(
	'materialChangeId',
	materialChangeSchema,
	'materialChanges'
);
