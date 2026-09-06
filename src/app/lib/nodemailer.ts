import nodemailer from "nodemailer";
import config from "../config";

export const transporter = nodemailer.createTransport({
	service: "gmail",
	auth: {
		user: config.sender_email,
		pass: config.sender_password,
	},
});
