import bcrypt from "bcryptjs";
import {
	AuthProvider,
	Role,
	SemesterStatus,
} from "../src/generated/prisma/index.js";
import prisma from "../src/app/lib/prisma.js";

const ADMIN_EMAIL = "admin@university.com";
const ADMIN_PASSWORD = "Admin@123";

const INSTRUCTOR_EMAIL = "instructor@university.com";
const INSTRUCTOR_PASSWORD = "Instructor@123";

const STUDENT_EMAIL = "student@university.com";
const STUDENT_PASSWORD = "Student@123";

const SALT_ROUNDS = 12;

const main = async () => {
	console.log("🌱 Seeding database...");

	// ---- Admin ----
	const hashedAdminPassword = await bcrypt.hash(ADMIN_PASSWORD, SALT_ROUNDS);

	const admin = await prisma.user.upsert({
		where: { email: ADMIN_EMAIL },
		update: {},
		create: {
			name: "System Admin",
			email: ADMIN_EMAIL,
			password: hashedAdminPassword,
			role: Role.ADMIN,
			authProvider: AuthProvider.CREDENTIAL,
			emailVerified: true,
		},
	});
	console.log(`✅ Admin ready: ${admin.email}`);

	// ---- Departments ----
	const cseDept = await prisma.department.upsert({
		where: { code: "CSE" },
		update: {},
		create: { name: "Computer Science and Engineering", code: "CSE" },
	});

	const eeeDept = await prisma.department.upsert({
		where: { code: "EEE" },
		update: {},
		create: { name: "Electrical and Electronic Engineering", code: "EEE" },
	});
	console.log("✅ Departments ready");

	// ---- Programs ----
	const bscse = await prisma.program.upsert({
		where: { code: "BSCSE" },
		update: {},
		create: {
			name: "B.Sc. in Computer Science and Engineering",
			code: "BSCSE",
			departmentId: cseDept.id,
		},
	});

	await prisma.program.upsert({
		where: { code: "BSEEE" },
		update: {},
		create: {
			name: "B.Sc. in Electrical and Electronic Engineering",
			code: "BSEEE",
			departmentId: eeeDept.id,
		},
	});
	console.log("✅ Programs ready");

	// ---- Courses ----
	const cse101 = await prisma.course.upsert({
		where: { code: "CSE101" },
		update: {},
		create: {
			name: "Introduction to Programming",
			code: "CSE101",
			credits: 3,
			description: "Fundamentals of programming using a modern language.",
			departmentId: cseDept.id,
		},
	});

	const cse201 = await prisma.course.upsert({
		where: { code: "CSE201" },
		update: {},
		create: {
			name: "Data Structures",
			code: "CSE201",
			credits: 3,
			description: "Core data structures and their applications.",
			departmentId: cseDept.id,
		},
	});

	await prisma.course.upsert({
		where: { code: "CSE301" },
		update: {},
		create: {
			name: "Database Systems",
			code: "CSE301",
			credits: 3,
			description: "Relational database design and SQL.",
			departmentId: cseDept.id,
		},
	});
	console.log("✅ Courses ready");

	// ---- Course Prerequisite: CSE201 requires CSE101 ----
	const existingPrerequisite = await prisma.coursePrerequisite.findUnique({
		where: {
			courseId_prerequisiteCourseId: {
				courseId: cse201.id,
				prerequisiteCourseId: cse101.id,
			},
		},
	});

	if (!existingPrerequisite) {
		await prisma.coursePrerequisite.create({
			data: { courseId: cse201.id, prerequisiteCourseId: cse101.id },
		});
	}
	console.log("✅ Course prerequisites ready");

	// ---- Semester ----
	const semester = await prisma.semester.upsert({
		where: { name: "Spring 2026" },
		update: {},
		create: {
			name: "Spring 2026",
			startDate: new Date("2026-01-15"),
			endDate: new Date("2026-05-15"),
			status: SemesterStatus.ACTIVE,
		},
	});
	console.log("✅ Semester ready");

	// ---- Instructor ----
	const hashedInstructorPassword = await bcrypt.hash(INSTRUCTOR_PASSWORD, SALT_ROUNDS);

	const instructorUser = await prisma.user.upsert({
		where: { email: INSTRUCTOR_EMAIL },
		update: {},
		create: {
			name: "Dr. Jane Rahman",
			email: INSTRUCTOR_EMAIL,
			password: hashedInstructorPassword,
			role: Role.INSTRUCTOR,
			authProvider: AuthProvider.CREDENTIAL,
			emailVerified: true,
		},
	});

	const instructorProfile = await prisma.instructor.upsert({
		where: { userId: instructorUser.id },
		update: {},
		create: {
			userId: instructorUser.id,
			instructorId: "INS-2026-0001",
			departmentId: cseDept.id,
			designation: "Assistant Professor",
		},
	});
	console.log(`✅ Instructor ready: ${instructorUser.email}`);

	// ---- Student ----
	const hashedStudentPassword = await bcrypt.hash(STUDENT_PASSWORD, SALT_ROUNDS);

	const studentUser = await prisma.user.upsert({
		where: { email: STUDENT_EMAIL },
		update: {},
		create: {
			name: "Karim Ahmed",
			email: STUDENT_EMAIL,
			password: hashedStudentPassword,
			role: Role.STUDENT,
			authProvider: AuthProvider.CREDENTIAL,
			emailVerified: true,
		},
	});

	await prisma.student.upsert({
		where: { userId: studentUser.id },
		update: {},
		create: {
			userId: studentUser.id,
			studentId: "STU-2026-0001",
			programId: bscse.id,
		},
	});
	console.log(`✅ Student ready: ${studentUser.email}`);

	// ---- Section: CSE101, Spring 2026, taught by the seeded instructor ----
	const existingSection = await prisma.section.findFirst({
		where: {
			courseId: cse101.id,
			semesterId: semester.id,
			sectionCode: "A",
		},
	});

	if (!existingSection) {
		await prisma.section.create({
			data: {
				courseId: cse101.id,
				semesterId: semester.id,
				instructorId: instructorProfile.id,
				sectionCode: "A",
				capacity: 40,
				schedule: "Sun/Tue/Thu 10:00–11:20",
			},
		});
	}
	console.log("✅ Section ready");

	console.log("🌱 Seeding complete.");
	console.log("");
	console.log("Demo credentials:");
	console.log(`  Admin:      ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
	console.log(`  Instructor: ${INSTRUCTOR_EMAIL} / ${INSTRUCTOR_PASSWORD}`);
	console.log(`  Student:    ${STUDENT_EMAIL} / ${STUDENT_PASSWORD}`);
};

main()
	.catch((error) => {
		console.error("❌ Seeding failed:", error);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
