import { Router } from "express";
import validateRequest from "../../middleware/validateRequest.js";
import { AuthController } from "./auth.controller.js";
import { AuthValidation } from "./auth.validation.js";
import { auth } from "../../middleware/checkAuth.js";
import { Role } from "../../../../generated/prisma/enums.js";

const router = Router();

router.post(
	"/register",
	validateRequest(AuthValidation.RegisterZodSchema),
	AuthController.registerStudent,
);

router.post(
	"/verify-email",
	validateRequest(AuthValidation.VerifyEmailZodSchema),
	AuthController.verifiedEmail,
);

router.post(
	"/login",
	validateRequest(AuthValidation.LoginZodSchema),
	AuthController.loginUser,
);

router.post(
	"/google-login",
	validateRequest(AuthValidation.GoogleLoginZodSchema),
	AuthController.googleLogin,
);

router.get("/me", auth(Role.ADMIN,Role.STUDENT,Role.INSTRUCTOR), AuthController.getMe);

router.post("/refresh-token", AuthController.refreshToken);

router.post(
	"/forgot-password",
	validateRequest(AuthValidation.ForgotPasswordZodSchema),
	AuthController.forgotPassword,
);

router.post(
	"/reset-password",
	validateRequest(AuthValidation.ResetPasswordZodSchema),
	AuthController.resetPassword,
);

router.post("/logout", AuthController.logout);

export const AuthRoutes = router;
