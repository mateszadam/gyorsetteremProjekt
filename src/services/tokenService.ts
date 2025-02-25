import { IUser } from '../models/models';
import { userModel } from '../models/mongooseSchema';
import defaultAnswers from '../helpers/statusCodeHelper';
const jwt = require('jsonwebtoken');
require('dotenv').config();

function generateToken(user: IUser) {
	let expiresIn = '1h';

	if (user.role === 'admin') {
		expiresIn = '1h';
	}
	switch (user.role) {
		case 'kitchen':
			expiresIn = '12h';
			break;
		case 'salesman':
			expiresIn = '12h';
			break;
		default:
			expiresIn = '1h';
	}

	return jwt.sign(
		{
			_id: user._id,
			name: user.name,
			role: user.role,
			email: user.email || '',
			profilePicture: user.profilePicture,
		},
		'SeCrEtToKeNeTtErEm!',
		{
			expiresIn: '12h',
		}
	);
}

async function isAuthValid(
	token: string,
	roles: string[] = ['customer', 'kitchen', 'salesman']
): Promise<boolean> {
	try {
		roles.push('admin');
		const data: IUser = jwt.verify(token, 'SeCrEtToKeNeTtErEm!');

		const databaseUser: IUser | null = await userModel.findById(data._id);
		if (databaseUser) {
			if (roles.includes(databaseUser.role)) {
				return true;
			}
		}
		return false;
	} catch (err: any) {
		console.log(err.message);
		return false;
	}
}

function getDataFromToken(token: string): IUser | undefined {
	try {
		return jwt.verify(token, 'SeCrEtToKeNeTtErEm!');
	} catch (error) {}
}
const authToken = async (req: any, res: any, next: any) => {
	const token = req.headers.authorization?.replace('Bearer ', '');

	if (token == null) return res.sendStatus(401);

	if (!(await isAuthValid(token))) {
		defaultAnswers.notAuthorized(res);
	} else {
		next();
	}
};

const authKitchenToken = async (req: any, res: any, next: any) => {
	const token = req.headers.authorization?.replace('Bearer ', '');

	if (token == null) return res.sendStatus(401);

	if (!(await isAuthValid(token, ['kitchen']))) {
		defaultAnswers.notAuthorized(res);
	} else {
		next();
	}
};

const authAdminToken = async (req: any, res: any, next: any) => {
	const token = req.headers.authorization?.replace('Bearer ', '');
	if (token == null) return res.sendStatus(401);
	if (!(await isAuthValid(token, ['admin']))) {
		defaultAnswers.notAuthorized(res);
	} else {
		next();
	}
};

const authSalesmanToken = async (req: any, res: any, next: any) => {
	const token = req.headers.authorization?.replace('Bearer ', '');
	if (token == null) return res.sendStatus(401);

	if (!(await isAuthValid(token, ['salesman']))) {
		defaultAnswers.notAuthorized(res);
	} else {
		next();
	}
};

export {
	generateToken,
	isAuthValid,
	authToken,
	authAdminToken,
	authKitchenToken,
	authSalesmanToken,
	getDataFromToken,
};
