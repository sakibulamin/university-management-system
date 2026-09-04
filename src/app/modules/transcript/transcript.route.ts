import { Router } from "express";
import checkAuth, { Role } from "../../middleware/checkAuth.js";
import { TranscriptController } from "./transcript.controller.js";

const router = Router();

router.get("/me", checkAuth(Role.STUDENT), TranscriptController.getMyTranscript);

export const TranscriptRoutes = router;
