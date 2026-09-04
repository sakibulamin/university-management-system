import { Router } from "express";
import checkAuth, { Role } from "../../middleware/checkAuth.js";
import validateRequest from "../../middleware/validateRequest.js";
import { PaymentController } from "./payment.controller.js";
import { PaymentValidation } from "./payment.validation.js";

const router = Router();

router.post(
	"/initiate",
	checkAuth(Role.STUDENT),
	validateRequest(PaymentValidation.InitiatePaymentZodSchema),
	PaymentController.initiatePayment,
);

router.post(
	"/success",
	checkAuth(Role.STUDENT),
	validateRequest(PaymentValidation.PaymentCallbackZodSchema),
	PaymentController.handleSuccessCallback,
);

router.post(
	"/fail",
	checkAuth(Role.STUDENT),
	validateRequest(PaymentValidation.PaymentCallbackZodSchema),
	PaymentController.handleFailCallback,
);

router.post(
	"/cancel",
	checkAuth(Role.STUDENT),
	validateRequest(PaymentValidation.PaymentCallbackZodSchema),
	PaymentController.handleCancelCallback,
);

// Static path registered before the dynamic "/:id" pattern.
router.get("/my-history", checkAuth(Role.STUDENT), PaymentController.getMyPaymentHistory);

router.get("/:id", checkAuth(Role.STUDENT, Role.ADMIN), PaymentController.getPaymentById);

export const PaymentRoutes = router;
