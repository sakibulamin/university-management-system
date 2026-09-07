import { Router } from "express";

import validateRequest from "../../middleware/validateRequest.js";
import { PaymentController } from "./payment.controller.js";
import { PaymentValidation } from "./payment.validation.js";
import { Role } from "../../../../generated/prisma/enums.js";
import { auth } from "../../middleware/checkAuth.js";

const router = Router();

router.post(
	"/initiate",
	auth(Role.STUDENT),
	validateRequest(PaymentValidation.InitiatePaymentZodSchema),
	PaymentController.initiatePayment,
);

router.post(
	"/success",
	auth(Role.STUDENT),
	validateRequest(PaymentValidation.PaymentCallbackZodSchema),
	PaymentController.successCallback,
);

router.post(
	"/fail",
	auth(Role.STUDENT),
	validateRequest(PaymentValidation.PaymentCallbackZodSchema),
	PaymentController.failCallback,
);

router.post(
	"/cancel",
	auth(Role.STUDENT),
	validateRequest(PaymentValidation.PaymentCallbackZodSchema),
	PaymentController.cancelCallback,
);

router.get(
	"/:id",
	auth(Role.STUDENT, Role.ADMIN),
	PaymentController.getPaymentById,
);

export const PaymentRoutes = router;
