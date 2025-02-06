import { log } from 'console';
import { IUser } from '../models/models';
import { userModel } from '../models/mongooseSchema';
import { defaultAnswers } from '../helpers/statusCodeHelper';
const jwt = require('jsonwebtoken');

function generateToken(user: IUser) {
	return jwt.sign(
		{
			name: user.name,
			role: user.role,
			_id: user._id,
		},
		'SeCrEtToKeN',
		{
			expiresIn: '12h',
		}
	);
}

async function isAuthValid(
	token: string,
	roles: string[] = ['admin', 'customer', 'kitchen', 'kiosk']
): Promise<boolean> {
	try {
		const data: IUser = jwt.verify(token, 'SeCrEtToKeN');
		log(data);
		if (roles.includes(data.role)) {
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
	isAuthValid,
	authenticateToken,
	authenticateAdminToken,
	authenticateKitchenToken,
	authenticateKioskToken,
};
