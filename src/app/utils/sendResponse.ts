import type { Response } from "express";

type TMeta = {
	page: number;
	limit: number;
	total: number;
	totalPages: number;
};

type TApiResponse<T> = {
	statusCode: number;
	success: boolean;
	message: string;
	meta?: TMeta;
	data: T;
};

const sendResponse = <T>(res: Response, payload: TApiResponse<T>) => {
	res.status(payload.statusCode).json({
		success: payload.success,
		statusCode: payload.statusCode,
		message: payload.message,
		...(payload.meta && { meta: payload.meta }),
		data: payload.data,
	});
};

export default sendResponse;
