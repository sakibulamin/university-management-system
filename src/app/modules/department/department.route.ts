import { Router } from "express";
import checkAuth, { Role } from "../../middleware/checkAuth.js";
import validateRequest from "../../middleware/validateRequest.js";
import { DepartmentController } from "./department.controller.js";
import { DepartmentValidation } from "./department.validation.js";

const router = Router();

router.post(
	"/",
	checkAuth(Role.ADMIN),
	validateRequest(DepartmentValidation.CreateDepartmentZodSchema),
	DepartmentController.createDepartment,
);

router.get("/", checkAuth(), DepartmentController.getAllDepartments);

router.get("/:id", checkAuth(), DepartmentController.getSingleDepartment);

router.patch(
	"/:id",
	checkAuth(Role.ADMIN),
	validateRequest(DepartmentValidation.UpdateDepartmentZodSchema),
	DepartmentController.updateDepartment,
);

router.delete("/:id", checkAuth(Role.ADMIN), DepartmentController.deleteDepartment);

export const DepartmentRoutes = router;
