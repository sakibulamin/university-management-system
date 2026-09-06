import type { UploadApiResponse } from "cloudinary";
import prisma from "../../lib/prisma";
import { Cloudinary } from "../../lib/cloudinary";

const getMyProfile = async (userId: string) => {
	const user = await prisma.user.findFirst({
		where: {
			id: userId,
			isDeleted: false,
		},
		select: {
			id: true,
			name: true,
			email: true,
			role: true,
			status: true,
			authProvider: true,
			emailVerified: true,
			imageUrl: true,
			createdAt: true,
			updatedAt: true,
		},
	});

	if (!user) {
		throw new Error("User not found");
	}

	return user;
};

const updateMyProfile = async (
	userId: string,
	data: {
		name?: string;
	},
) => {
	const user = await prisma.user.update({
		where: {
			id: userId,
		},
		data: {
			...(data.name && {
				name: data.name,
			}),
		},
		select: {
			id: true,
			name: true,
			email: true,
			role: true,
			status: true,
			authProvider: true,
			emailVerified: true,
			imageUrl: true,
			updatedAt: true,
		},
	});

	return user;
};

const uploadProfileImage = async (buffer: Buffer, userId: string) => {
	const currentUser = await prisma.user.findFirst({
		where: {
			id: userId,
			isDeleted: false,
		},
		select: {
			imageUrl: true,
			imagePublicId: true,
		},
	});

	if (!currentUser) {
		throw new Error("User not found");
	}

	const cloudinaryResult = await new Promise<UploadApiResponse>(
		(resolve, reject) => {
			Cloudinary.uploader
				.upload_stream(
					{
						resource_type: "image",
						folder: "university-management/users",
					},
					(error, result) => {
						if (error) {
							return reject(error);
						}

						if (!result) {
							return reject(new Error("No file returned from Cloudinary"));
						}

						resolve(result);
					},
				)
				.end(buffer);
		},
	);

	const updatedUser = await prisma.user.update({
		where: {
			id: userId,
		},
		data: {
			imageUrl: cloudinaryResult.secure_url,
			imagePublicId: cloudinaryResult.public_id,
		},
		select: {
			id: true,
			name: true,
			email: true,
			role: true,
			status: true,
			imageUrl: true,
			updatedAt: true,
		},
	});

	return updatedUser;
};

export const userService = {
	getMyProfile,
	updateMyProfile,
	uploadProfileImage,
};
