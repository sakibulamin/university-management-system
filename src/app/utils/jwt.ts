// import jwt, { type JwtPayload, type SignOptions } from "jsonwebtoken";

// const generateToken = (payload: JwtPayload, secret: string, expiresIn: string) => {
// 	const token = jwt.sign(payload, secret, {
// 		expiresIn,
// 	} as SignOptions);

// 	return token;
// };

// const verifyToken = (token: string, secret: string) => {
// 	return jwt.verify(token, secret) as JwtPayload;
// };

// // Converts a jsonwebtoken-style "expiresIn" string ("15m", "30d", "12h", "45s")
// // into an absolute Date, used for RefreshToken.expiresAt.
// // const getExpiryDate = (expiresIn: string): Date => {
// // 	const match = expiresIn.match(/^(\d+)([smhd])$/);

// // 	if (!match) {
// // 		throw new Error(`Invalid expiresIn format: ${expiresIn}`);
// // 	}

// // 	const value = Number(match[1]);
// // 	const unit = match[2];

// // 	const unitToMs: Record<string, number> = {
// // 		s: 1000,
// // 		m: 60 * 1000,
// // 		h: 60 * 60 * 1000,
// // 		d: 24 * 60 * 60 * 1000,
// // 	};

// // 	return new Date(Date.now() + value * unitToMs[unit]);
// // };

// export const jwtUtils = {
// 	generateToken,
// 	verifyToken,
// 	// getExpiryDate,
// };

import jwt, { type JwtPayload, type SignOptions } from "jsonwebtoken";

const createToken = (
	payload: JwtPayload,
	secret: string,
	expiresIn: SignOptions,
) => {
	const token = jwt.sign(payload, secret, {
		expiresIn,
	} as SignOptions);

	return token;
};

const verifyToken = (token: string, secret: string) => {
	try {
		const verifiedToken = jwt.verify(token, secret);
		return {
			success: true,
			data: verifiedToken,
		};
	} catch (error: any) {
		console.log("Token verification failed:", error);
		return {
			success: false,
			error: error.message,
		};
	}
};

export const jwtUtils = {
	createToken,
	verifyToken,
};
