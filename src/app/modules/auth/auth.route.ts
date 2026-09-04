import { Router } from "express";
import checkAuth from "../../middleware/checkAuth.js";
import { rateLimiter } from "../../middleware/rateLimiter.js";
import validateRequest from "../../middleware/validateRequest.js";
import { AuthController } from "./auth.controller.js";
import { AuthValidation } from "./auth.validation.js";

const router = Router();

router.post(
	"/register",
	rateLimiter.authRateLimiter,
	validateRequest(AuthValidation.RegisterZodSchema),
	AuthController.register,
);

router.post(
	"/verify-email",
	rateLimiter.authRateLimiter,
	validateRequest(AuthValidation.VerifyEmailZodSchema),
	AuthController.verifyEmail,
);

router.post(
	"/login",
	rateLimiter.authRateLimiter,
	validateRequest(AuthValidation.LoginZodSchema),
	AuthController.login,
);

router.post(
	"/google-login",
	rateLimiter.authRateLimiter,
	validateRequest(AuthValidation.GoogleLoginZodSchema),
	AuthController.googleLogin,
);

router.get("/me", checkAuth(), AuthController.getMe);

router.post("/refresh-token", AuthController.refreshToken);

router.post(
	"/forgot-password",
	rateLimiter.authRateLimiter,
	validateRequest(AuthValidation.ForgotPasswordZodSchema),
	AuthController.forgotPassword,
);

router.post(
	"/reset-password",
	rateLimiter.authRateLimiter,
	validateRequest(AuthValidation.ResetPasswordZodSchema),
	AuthController.resetPassword,
);

router.post("/logout", AuthController.logout);

export const AuthRoutes = router;
