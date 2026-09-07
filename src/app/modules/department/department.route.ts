import { Router } from "express";

import validateRequest from "../../middleware/validateRequest.js";
import { DepartmentController } from "./department.controller.js";
import { DepartmentValidation } from "./department.validation.js";

import { Role } from "../../../../generated/prisma/enums.js";
import { auth } from "../../middleware/checkAuth.js";

const router = Router();

router.post(
	"/",
	auth(Role.ADMIN),
	validateRequest(DepartmentValidation.CreateDepartmentZodSchema),
	DepartmentController.createDepartment,
);

router.get(
	"/",
	auth(Role.ADMIN, Role.STUDENT, Role.INSTRUCTOR),
	DepartmentController.getAllDepartments,
);

router.get(
	"/:id",
	auth(Role.ADMIN, Role.STUDENT, Role.INSTRUCTOR),
	DepartmentController.getSingleDepartment,
);

router.patch(
	"/:id",
	auth(Role.ADMIN),
	validateRequest(DepartmentValidation.UpdateDepartmentZodSchema),
	DepartmentController.updateDepartment,
);

router.delete("/:id", auth(Role.ADMIN), DepartmentController.deleteDepartment);

export const DepartmentRoutes = router;
