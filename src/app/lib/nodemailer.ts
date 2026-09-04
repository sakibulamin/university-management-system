import nodemailer from "nodemailer";
import config from "../config/index.js";

// Assumes Gmail SMTP based on SENDER_EMAIL/SENDER_PASSWORD in .env.example.
// Swap the "service" option (or use host/port) if a different provider is used.
const transporter = nodemailer.createTransport({
	service: "gmail",
	auth: {
		user: config.sender_email,
		pass: config.sender_password,
	},
});

type TSendEmailPayload = {
	to: string;
	subject: string;
	html: string;
};

const sendEmail = async (payload: TSendEmailPayload) => {
	await transporter.sendMail({
		from: config.sender_email,
		to: payload.to,
		subject: payload.subject,
		html: payload.html,
	});
};

export default sendEmail;
