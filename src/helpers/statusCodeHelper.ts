import { Router, Request, Response } from 'express';

class defaultAnswers {
	static async ok(res: Response, message: string = '') {
		if (message == '') {
			res.sendStatus(200);
		} else {
			res.status(200).json({ message });
		}
	}

	static async created(res: Response) {
		res.sendStatus(201);
	}

	static async notAuthorized(res: Response) {
		res.sendStatus(401);
	}

	static async notFound(res: Response) {
		res.sendStatus(404);
	}
	static async notImplemented(res: Response) {
		res.sendStatus(501);
	}
	static async badRequest(res: Response, message: string = '') {
		if (message == '') {
			res.sendStatus(400);
		} else {
			res.status(400).json({ message: message });
		}
	}
}

export { defaultAnswers };
