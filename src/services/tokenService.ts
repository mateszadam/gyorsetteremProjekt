import { IUser } from '../models/models';
import { userModel } from '../models/mongooseSchema';
import defaultAnswers from '../helpers/statusCodeHelper';
const jwt = require('jsonwebtoken');
require('dotenv').config();

function generateToken(user: IUser) {
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
	roles: string[] = ['customer', 'kitchen', 'kiosk']
): Promise<boolean> {
	try {
		roles.push('admin');
		const data: IUser = jwt.verify(token, 'SeCrEtToKeNeTtErEm!');

		const databaseUser: IUser | null = await userModel.findById(data._id);
		const isTest = process.env.IS_TEST || false;
		if (databaseUser) {
			if (roles.includes(databaseUser.role)) {
				return true;
			}
		} else if (isTest) {
			return true;
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

const authKioskToken = async (req: any, res: any, next: any) => {
	const token = req.headers.authorization?.replace('Bearer ', '');
	if (token == null) return res.sendStatus(401);

	if (!(await isAuthValid(token, ['kiosk']))) {
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
	authKioskToken,
	getDataFromToken,
};
