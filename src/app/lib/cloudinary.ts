import { v2 as cloudinary } from "cloudinary";
import config from "../config";

cloudinary.config({
	cloud_name: config.cloudinary_cloude_name,
	api_key: config.cloudinary_api_key,
	api_secret: config.cloudinary_api_secret,
});
console.log(config.cloudinary_api_secret, "cloudinaer");

export const Cloudinary = cloudinary;
