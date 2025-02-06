import { IUser } from '../models/models';
import { userModel } from '../models/mongooseSchema';
import { defaultAnswers } from '../helpers/statusCodeHelper';
const jwt = require('jsonwebtoken');

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

function isAuthValid(
	token: string,
	roles: string[] = ['customer', 'kitchen', 'kiosk']
): boolean {
	try {
		roles.push('admin');
		const data: IUser = jwt.verify(token, 'SeCrEtToKeNeTtErEm!');
		if (roles.includes(data.role)) {
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
const authenticateToken = async (req: any, res: any, next: any) => {
	const token = req.headers.authorization?.replace('Bearer ', '');

	if (token == null) return res.sendStatus(401);

	if (!(await isAuthValid(token))) {
		defaultAnswers.notAuthorized(res);
	} else {
		next();
	}
};

const authenticateKitchenToken = async (req: any, res: any, next: any) => {
	const token = req.headers.authorization?.replace('Bearer ', '');

	if (token == null) return res.sendStatus(401);

	if (!(await isAuthValid(token, ['kitchen']))) {
		defaultAnswers.notAuthorized(res);
	} else {
		next();
	}
};

const authenticateAdminToken = async (req: any, res: any, next: any) => {
	const token = req.headers.authorization?.replace('Bearer ', '');
	if (token == null) return res.sendStatus(401);
	if (!(await isAuthValid(token, ['admin']))) {
		defaultAnswers.notAuthorized(res);
	} else {
		next();
	}
};

const authenticateKioskToken = async (req: any, res: any, next: any) => {
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
	authenticateToken,
	authenticateAdminToken,
	authenticateKitchenToken,
	authenticateKioskToken,
	getDataFromToken,
};
