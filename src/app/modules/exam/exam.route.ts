import { Router } from "express";
import checkAuth, { Role } from "../../middleware/checkAuth.js";
import validateRequest from "../../middleware/validateRequest.js";
import { ExamController } from "./exam.controller.js";
import { ExamValidation } from "./exam.validation.js";

const router = Router();

router.post(
	"/",
	checkAuth(Role.ADMIN, Role.INSTRUCTOR),
	validateRequest(ExamValidation.CreateExamZodSchema),
	ExamController.createExam,
);

router.get("/", checkAuth(), ExamController.getAllExams);

router.get("/:id", checkAuth(), ExamController.getSingleExam);

router.patch(
	"/:id",
	checkAuth(Role.ADMIN, Role.INSTRUCTOR),
	validateRequest(ExamValidation.UpdateExamZodSchema),
	ExamController.updateExam,
);

export const ExamRoutes = router;
