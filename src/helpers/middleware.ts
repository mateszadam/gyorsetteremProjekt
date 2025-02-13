import languageBasedErrorMessage from './laguageHelper';

const jsonErrorHandler = (err: any, req: any, res: any, next: any) => {
	if ((err.type = 'entity.parse.failed')) {
		const message = languageBasedErrorMessage.getError(req, '01');
		res.status(500).send({ message: message });
	}
};

export { jsonErrorHandler };
