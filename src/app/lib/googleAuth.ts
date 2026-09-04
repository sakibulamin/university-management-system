import { OAuth2Client, type TokenPayload } from "google-auth-library";
import httpStatus from "http-status";
import config from "../config/index.js";
import AppError from "../utils/AppError.js";

const googleClient = new OAuth2Client(config.google_client_id);

type TGoogleProfile = {
	googleId: string;
	email: string;
	name: string;
	emailVerified: boolean;
};

export const verifyGoogleIdToken = async (idToken: string): Promise<TGoogleProfile> => {
	let payload: TokenPayload | undefined;

	try {
		const ticket = await googleClient.verifyIdToken({
			idToken,
			audience: config.google_client_id,
		});
		payload = ticket.getPayload();
	} catch {
		throw new AppError(httpStatus.BAD_REQUEST, "Invalid or expired Google token");
	}

	if (!payload || !payload.email || !payload.sub) {
		throw new AppError(httpStatus.BAD_REQUEST, "Invalid Google token payload");
	}

	return {
		googleId: payload.sub,
		email: payload.email,
		name: payload.name || payload.email,
		emailVerified: payload.email_verified ?? false,
	};
};
