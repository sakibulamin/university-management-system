import type { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import config from "../config/index.js";
import { Role } from "../../generated/prisma/index.js";
import type { Role as TRole } from "../../generated/prisma/index.js";
import prisma from "../lib/prisma.js";
import AppError from "../utils/AppError.js";
import { jwtHelpers } from "../utils/jwt.js";

// Phase 3 resolved this: Role now comes directly from the generated
// Prisma client, since the User model + Role enum exist in schema.prisma.
export { Role };

declare global {
	namespace Express {
		interface Request {
			user?: {
				id: string;
				email: string;
				role: TRole;
			};
		}
	}
}

const checkAuth = (...allowedRoles: TRole[]) => {
	return async (req: Request, _res: Response, next: NextFunction) => {
		try {
			const authHeader = req.headers.authorization;

			if (!authHeader || !authHeader.startsWith("Bearer ")) {
				throw new AppError(httpStatus.UNAUTHORIZED, "You are not authorized");
			}

			const token = authHeader.split(" ")[1];

			if (!config.jwt_access_secret) {
				throw new AppError(
					httpStatus.INTERNAL_SERVER_ERROR,
					"JWT access secret is not configured",
				);
			}

			const decoded = jwtHelpers.verifyToken(token, config.jwt_access_secret);
			const { id, role } = decoded as { id: string; role: TRole };

			const user = await prisma.user.findUnique({
				where: { id },
			});

			if (!user || user.isDeleted) {
				throw new AppError(httpStatus.UNAUTHORIZED, "User does not exist");
			}

			if (user.status === "BLOCKED") {
				throw new AppError(httpStatus.FORBIDDEN, "This user is blocked");
			}

			if (user.status === "DELETED") {
				throw new AppError(httpStatus.FORBIDDEN, "This user is deleted");
			}

			if (allowedRoles.length && !allowedRoles.includes(role)) {
				throw new AppError(
					httpStatus.FORBIDDEN,
					"You do not have permission to access this resource",
				);
			}

			req.user = { id: user.id, email: user.email, role: user.role as TRole };

			next();
		} catch (error) {
			next(error);
		}
	};
};

export default checkAuth;
