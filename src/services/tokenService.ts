import { log } from 'console';
import { defaultAnswers, getRawId, User } from '../models/models';
import { userModel } from '../models/mongooseSchema';
import { NextFunction, Response, Request } from 'express';

const jwt = require('jsonwebtoken');

function generateToken(user: User) {
	log(user._id);
	return jwt.sign(
		{
			name: user.name,
		},
		getRawId(user._id),
		{
			expiresIn: '1h',
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
	roles: string[] = ['admin', 'customer']
): Promise<boolean> {
	const loggedInUser: User | null = await userModel.findOne({ token: token });
	if (
		loggedInUser &&
		loggedInUser._id &&
		verifyToken(token, getRawId(loggedInUser._id)) &&
		roles.includes(loggedInUser.role!)
	) {
		return true;
	}
	return false;
}

const authenticateToken = async (req: any, res: any, next: any) => {
	const token = req.headers.authorization?.replace('Bearer ', '');
	log(token);
	if (token == null) return res.sendStatus(401);

	if (!(await isAuthValid(token))) {
		defaultAnswers.notAuthorized(res);
	} else {
		next();
	}
};

const authenticateAdminToken = async (req: any, res: any, next: any) => {
	const token = req.headers.authorization?.replace('Bearer ', '');
	log(token);
	if (token == null) return res.sendStatus(401);

	if (!(await isAuthValid(token, ['admin']))) {
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
};
