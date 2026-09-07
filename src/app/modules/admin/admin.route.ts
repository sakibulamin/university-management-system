import { Router } from "express";

import validateRequest from "../../middleware/validateRequest.js";
import { AdminController } from "./admin.controller.js";
import { AdminValidation } from "./admin.validation.js";

import { Role } from "../../../../generated/prisma/enums.js";
import { auth } from "../../middleware/checkAuth.js";

const router = Router();

router.get("/users", auth(Role.ADMIN), AdminController.getAllUsers);

router.patch(
	"/users/:id/role",
	auth(Role.ADMIN),
	validateRequest(AdminValidation.UpdateUserRoleZodSchema),
	AdminController.updateUserRole,
);

router.patch("/users/:id/block", auth(Role.ADMIN), AdminController.blockUser);

router.patch(
	"/users/:id/unblock",
	auth(Role.ADMIN),
	AdminController.unblockUser,
);

router.delete("/users/:id", auth(Role.ADMIN), AdminController.deleteUser);

router.get(
	"/dashboard-stats",
	auth(Role.ADMIN),
	AdminController.getDashboardStats,
);

router.get("/audit-logs", auth(Role.ADMIN), AdminController.getAuditLogs);

export const AdminRoutes = router;
