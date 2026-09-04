import { Router } from "express";
import checkAuth, { Role } from "../../middleware/checkAuth.js";
import validateRequest from "../../middleware/validateRequest.js";
import { AdminController } from "./admin.controller.js";
import { AdminValidation } from "./admin.validation.js";

const router = Router();

router.get("/users", checkAuth(Role.ADMIN), AdminController.getAllUsers);

router.patch(
	"/users/:id/role",
	checkAuth(Role.ADMIN),
	validateRequest(AdminValidation.UpdateUserRoleZodSchema),
	AdminController.updateUserRole,
);

router.patch("/users/:id/block", checkAuth(Role.ADMIN), AdminController.blockUser);

router.patch("/users/:id/unblock", checkAuth(Role.ADMIN), AdminController.unblockUser);

router.delete("/users/:id", checkAuth(Role.ADMIN), AdminController.deleteUser);

router.get("/dashboard-stats", checkAuth(Role.ADMIN), AdminController.getDashboardStats);

router.get("/audit-logs", checkAuth(Role.ADMIN), AdminController.getAuditLogs);

export const AdminRoutes = router;
