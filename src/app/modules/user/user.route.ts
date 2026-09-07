import { Router } from "express";
import { userController } from "./user.controller";
import { auth } from "../../middleware/checkAuth";

import { upload } from "../../lib/multer";
import { Role } from "../../../../generated/prisma/enums";

const router = Router();

router.get(
	"/my-profile",
	auth(Role.ADMIN, Role.STUDENT, Role.INSTRUCTOR),
	userController.getMyProfile,
);

router.post(
	"/update-profile",
	auth(Role.ADMIN, Role.STUDENT, Role.INSTRUCTOR),
	userController.updateMyProfile,
);

router.patch(
	"/profile-image",
	auth(Role.ADMIN, Role.STUDENT, Role.INSTRUCTOR),
	upload.single("profile-image"),
	userController.uploadProfileImage,
);
export const UserRoutes = router;
