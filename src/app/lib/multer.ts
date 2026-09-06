import multer from "multer";

const stroage = multer.memoryStorage();
export const upload = multer({ storage: stroage });
