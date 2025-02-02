import { log } from 'console';
import { IUser } from '../models/models';
import { userModel } from '../models/mongooseSchema';
import { defaultAnswers } from '../helpers/statusCodeHelper';

const jwt = require('jsonwebtoken');

function generateToken(user: IUser) {
	return jwt.sign(
		{
			name: user.role,
		},
		user.role,
		{
			expiresIn: '12h',
		}
	);
}

function verifyToken(token: string, id: string): boolean {
	try {
		return jwt.verify(token, id);
	} catch {
		return false;
	}
}

async function isAuthValid(
	token: string,
	roles: string[] = ['admin', 'customer', 'kitchen', 'kiosk']
): Promise<boolean> {
	try {
		roles.push('admin');
		const loggedInUser: IUser | null = await userModel.findOne({
			token: token,
		});
		if (
			loggedInUser &&
			loggedInUser._id &&
			verifyToken(token, loggedInUser.role!) &&
			roles.includes(loggedInUser.role!)
		) {
			return true;
		}
		return false;
	} catch {
		return false;
	}
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
	verifyToken,
	isAuthValid,
	authenticateToken,
	authenticateAdminToken,
	authenticateKitchenToken,
	authenticateKioskToken,
};
