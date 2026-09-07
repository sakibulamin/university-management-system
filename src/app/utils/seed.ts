import bcrypt from "bcryptjs";

import config from "../config";
import prisma from "../lib/prisma";
import {
	AuthProvider,
	Role,
	UserStatus,
} from "../../../generated/prisma/enums";

export const seedTesterAdmin = async () => {
	try {
		const isTesterAdminExist = await prisma.user.findUnique({
			where: {
				email: config.tester_admin_email,
			},
		});

		if (isTesterAdminExist) {
			console.log("Tester Admin Already Exists!");
			return;
		}

		const hashedPassword = await bcrypt.hash(
			config.tester_admin_password,
			Number(config.bcrypt_salt_rounds),
		);

		const testerAdmin = await prisma.user.create({
			data: {
				name: "System Admin",
				email: config.tester_admin_email,
				password: hashedPassword,
				role: Role.ADMIN,
				status: UserStatus.ACTIVE,
				authProvider: AuthProvider.CREDENTIAL,
				emailVerified: true,
			},
		});

		console.log("Tester Admin Created:", testerAdmin);
	} catch (error) {
		console.log("Error Seeding Tester Admin:", error);
	}
};

export const seedTesterInstructor = async () => {
	try {
		const isTesterInstructorExist = await prisma.user.findUnique({
			where: {
				email: config.tester_instructor_email,
			},
		});

		if (isTesterInstructorExist) {
			console.log("Tester Instructor Already Exists!");
			return;
		}

		const hashedPassword = await bcrypt.hash(
			config.tester_instructor_password,
			Number(config.bcrypt_salt_rounds),
		);

		const testerInstructor = await prisma.user.create({
			data: {
				name: "Test Instructor",
				email: config.tester_instructor_email,
				password: hashedPassword,
				role: Role.INSTRUCTOR,
				status: UserStatus.ACTIVE,
				authProvider: AuthProvider.CREDENTIAL,
				emailVerified: true,
			},
		});

		console.log("Tester Instructor Created:", testerInstructor);
	} catch (error) {
		console.log("Error Seeding Tester Instructor:", error);
	}
};

export const seedTesterStudent = async () => {
	try {
		const isTesterStudentExist = await prisma.user.findUnique({
			where: {
				email: config.tester_student_email,
			},
		});

		if (isTesterStudentExist) {
			console.log("Tester Student Already Exists!");
			return;
		}

		const hashedPassword = await bcrypt.hash(
			config.tester_student_password,
			Number(config.bcrypt_salt_rounds),
		);

		const testerStudent = await prisma.user.create({
			data: {
				name: "Test Student",
				email: config.tester_student_email,
				password: hashedPassword,
				role: Role.STUDENT,
				status: UserStatus.ACTIVE,
				authProvider: AuthProvider.CREDENTIAL,
				emailVerified: true,
			},
		});

		console.log("Tester Student Created:", testerStudent);
	} catch (error) {
		console.log("Error Seeding Tester Student:", error);
	}
};
