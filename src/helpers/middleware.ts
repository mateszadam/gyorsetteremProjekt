import { Request, Response, NextFunction } from 'express';
import defaultAnswers from './statusCodeHelper';

const jsonErrorHandler = (err: any, req: any, res: any, next: any) => {
	if ((err.type = 'entity.parse.failed'))
		res.status(500).send({ message: 'Invalid JSON!' });
	res.status(500).send({ error: err });
};

export { jsonErrorHandler };
