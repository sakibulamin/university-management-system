import config from "../config";
import { redisClient } from "./redis";

const ID_TOKEN_KEY = "bkash:idToken";
const REFRESH_TOKEN_KEY = "bkash:refreshToken";

const ID_TOKEN_TTL = 60 * 60;
const REFRESH_TOKEN_TTL = 60 * 60 * 24 * 28;
const TOKEN_REFRESH_THRESHOLD = 600;

interface TBkashTokenResponse {
	id_token: string;
	refresh_token: string;
	expires_in?: number;
	token_type?: string;
}

interface TBkashCreatePaymentResponse {
	paymentID: string;
	createTime?: string;
	orgLogo?: string;
	orgName?: string;
	transactionStatus?: string;
	amount?: string;
	currency?: string;
	intent?: string;
	merchantInvoiceNumber?: string;
	bkashURL: string;
	statusCode?: string;
	statusMessage?: string;
}

interface TBkashExecutePaymentResponse {
	paymentID: string;
	trxID?: string;
	transactionStatus?: string;
	transactionStatusMessage?: string;
	amount?: string;
	currency?: string;
	intent?: string;
	merchantInvoiceNumber?: string;
	statusCode?: string;
	statusMessage?: string;
}

interface TBkashQueryPaymentResponse {
	paymentID: string;
	trxID?: string;
	transactionStatus?: string;
	transactionStatusMessage?: string;
	amount?: string;
	currency?: string;
	intent?: string;
	merchantInvoiceNumber?: string;
	statusCode?: string;
	statusMessage?: string;
}

const getBkashIdToken = async (): Promise<string> => {
	try {
		let idToken = await redisClient.get(ID_TOKEN_KEY);

		const idTokenTTL = await redisClient.ttl(ID_TOKEN_KEY);

		const refreshToken = await redisClient.get(REFRESH_TOKEN_KEY);

		const refreshTokenTTL = await redisClient.ttl(REFRESH_TOKEN_KEY);

		if (idToken && idTokenTTL > TOKEN_REFRESH_THRESHOLD) {
			return idToken;
		}

		if (refreshToken && refreshTokenTTL > TOKEN_REFRESH_THRESHOLD) {
			try {
				const refreshResponse = await fetch(
					`${config.bkash_base_url}/tokenized/checkout/token/refresh`,
					{
						method: "POST",
						headers: {
							"Content-Type": "application/json",
							Accept: "application/json",
							username: config.bkash_username,
							password: config.bkash_password,
						},
						body: JSON.stringify({
							app_key: config.bkash_app_key,
							app_secret: config.bkash_app_secret,
							refresh_token: refreshToken,
						}),
					},
				);

				if (refreshResponse.ok) {
					const refreshResult =
						(await refreshResponse.json()) as TBkashTokenResponse;

					if (refreshResult.id_token) {
						idToken = refreshResult.id_token;

						await redisClient.set(ID_TOKEN_KEY, idToken, {
							expiration: {
								type: "EX",
								value: ID_TOKEN_TTL,
							},
						});

						return idToken;
					}
				}
			} catch {}
		}

		const response = await fetch(
			`${config.bkash_base_url}/tokenized/checkout/token/grant`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Accept: "application/json",
					username: config.bkash_username,
					password: config.bkash_password,
				},
				body: JSON.stringify({
					app_key: config.bkash_app_key,
					app_secret: config.bkash_app_secret,
				}),
			},
		);

		if (!response.ok) {
			const errorText = await response.text();

			throw new Error(
				`bKash token grant failed: ${response.status} ${errorText}`,
			);
		}

		const result = (await response.json()) as TBkashTokenResponse;

		if (!result.id_token) {
			throw new Error("bKash did not return an ID token");
		}

		await redisClient.set(ID_TOKEN_KEY, result.id_token, {
			expiration: {
				type: "EX",
				value: ID_TOKEN_TTL,
			},
		});

		if (result.refresh_token) {
			await redisClient.set(REFRESH_TOKEN_KEY, result.refresh_token, {
				expiration: {
					type: "EX",
					value: REFRESH_TOKEN_TTL,
				},
			});
		}

		return result.id_token;
	} catch (error) {
		throw new Error(
			error instanceof Error ? error.message : "Failed to get bKash ID token",
		);
	}
};

const getAuthHeaders = async () => {
	const idToken = await getBkashIdToken();

	return {
		"Content-Type": "application/json",
		Accept: "application/json",
		Authorization: idToken,
		"X-App-Key": config.bkash_app_key,
	};
};

const createPayment = async (payload: {
	amount: number;
	merchantInvoiceNumber: string;
	payerReference: string;
	callbackURL: string;
}): Promise<TBkashCreatePaymentResponse> => {
	const headers = await getAuthHeaders();

	console.log("bKash Base URL:", config.bkash_base_url);
	console.log("bKash Create Payment Payload:", {
		...payload,
		amount: payload.amount.toFixed(2),
	});

	const response = await fetch(
		`${config.bkash_base_url}/tokenized/checkout/create`,
		{
			method: "POST",
			headers,
			body: JSON.stringify({
				mode: "0011",
				payerReference: payload.payerReference,
				callbackURL: payload.callbackURL,
				amount: payload.amount.toFixed(2),
				currency: "BDT",
				intent: "sale",
				merchantInvoiceNumber: payload.merchantInvoiceNumber,
			}),
		},
	);

	const responseText = await response.text();

	console.log("bKash Create Payment Status:", response.status);
	console.log("bKash Create Payment Response:", responseText);

	let result: TBkashCreatePaymentResponse;

	try {
		result = JSON.parse(responseText);
	} catch {
		throw new Error(`bKash returned invalid response: ${responseText}`);
	}

	if (!response.ok || result.statusCode !== "0000") {
		throw new Error(
			`bKash Create Payment Failed: ${result.statusCode} - ${
				result.statusMessage || "Unknown error"
			}`,
		);
	}

	if (!result.paymentID || !result.bkashURL) {
		throw new Error("Invalid response received from bKash");
	}

	return result;
};

const executePayment = async (
	paymentID: string,
): Promise<TBkashExecutePaymentResponse> => {
	const headers = await getAuthHeaders();

	const response = await fetch(
		`${config.bkash_base_url}/tokenized/checkout/execute`,
		{
			method: "POST",
			headers,
			body: JSON.stringify({
				paymentID,
			}),
		},
	);

	const result = (await response.json()) as TBkashExecutePaymentResponse;

	if (!response.ok) {
		throw new Error(result.statusMessage || "Failed to execute bKash payment");
	}

	return result;
};

const queryPayment = async (
	paymentID: string,
): Promise<TBkashQueryPaymentResponse> => {
	const headers = await getAuthHeaders();

	const response = await fetch(
		`${config.bkash_base_url}/tokenized/checkout/payment/status`,
		{
			method: "POST",
			headers,
			body: JSON.stringify({
				paymentID,
			}),
		},
	);

	const result = (await response.json()) as TBkashQueryPaymentResponse;

	if (!response.ok) {
		throw new Error(result.statusMessage || "Failed to query bKash payment");
	}

	return result;
};

export const bkash = {
	createPayment,
	executePayment,
	queryPayment,
	getBkashIdToken,
};
