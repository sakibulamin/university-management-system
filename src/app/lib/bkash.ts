import config from "../config/index.js";
import redisClient from "./redis.js";

const TOKEN_CACHE_KEY = "bkash:id_token";

type TBkashTokenResponse = {
	id_token: string;
	token_type: string;
	expires_in: number;
	refresh_token: string;
};

export type TBkashCreatePaymentResponse = {
	paymentID: string;
	bkashURL: string;
	callbackURL: string;
	amount: string;
	currency: string;
	intent: string;
	merchantInvoiceNumber: string;
	paymentCreateTime: string;
	transactionStatus: string;
	statusCode?: string;
	statusMessage?: string;
};

export type TBkashExecutePaymentResponse = {
	paymentID: string;
	trxID?: string;
	transactionStatus: string;
	amount?: string;
	currency?: string;
	statusCode?: string;
	statusMessage?: string;
};

const grantToken = async (): Promise<TBkashTokenResponse> => {
	const response = await fetch(`${config.bkash_base_url}/tokenized/checkout/token/grant`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Accept: "application/json",
			username: config.bkash_username ?? "",
			password: config.bkash_password ?? "",
		},
		body: JSON.stringify({
			app_key: config.bkash_app_key,
			app_secret: config.bkash_app_secret,
		}),
	});

	if (!response.ok) {
		throw new Error(`bKash token grant failed with status ${response.status}`);
	}

	return (await response.json()) as TBkashTokenResponse;
};

// Cached in Redis so we don't re-grant a token on every payment call —
// tokens are cached for slightly less than bKash's reported expiry.
const getIdToken = async (): Promise<string> => {
	const cached = await redisClient.get(TOKEN_CACHE_KEY).catch(() => null);

	if (cached) {
		return cached;
	}

	const tokenResponse = await grantToken();
	const ttlSeconds = Math.max(60, tokenResponse.expires_in - 60);

	await redisClient.setEx(TOKEN_CACHE_KEY, ttlSeconds, tokenResponse.id_token);

	return tokenResponse.id_token;
};

const getAuthHeaders = async () => {
	const idToken = await getIdToken();

	return {
		"Content-Type": "application/json",
		Accept: "application/json",
		Authorization: idToken,
		"X-App-Key": config.bkash_app_key ?? "",
	};
};

const createPayment = async (payload: {
	amount: number;
	merchantInvoiceNumber: string;
	payerReference: string;
	callbackURL: string;
}): Promise<TBkashCreatePaymentResponse> => {
	const headers = await getAuthHeaders();

	const response = await fetch(`${config.bkash_base_url}/tokenized/checkout/create`, {
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
	});

	const data = (await response.json()) as TBkashCreatePaymentResponse;

	if (!response.ok || !data.paymentID) {
		throw new Error(data.statusMessage ?? "bKash create payment failed");
	}

	return data;
};

// Does NOT throw on business failure — bKash returns a structured
// transactionStatus/statusMessage even for failed executions. The caller
// inspects transactionStatus to decide PAID vs FAILED.
const executePayment = async (paymentID: string): Promise<TBkashExecutePaymentResponse> => {
	const headers = await getAuthHeaders();

	const response = await fetch(`${config.bkash_base_url}/tokenized/checkout/execute`, {
		method: "POST",
		headers,
		body: JSON.stringify({ paymentID }),
	});

	return (await response.json()) as TBkashExecutePaymentResponse;
};

const queryPayment = async (paymentID: string): Promise<TBkashExecutePaymentResponse> => {
	const headers = await getAuthHeaders();

	const response = await fetch(
		`${config.bkash_base_url}/tokenized/checkout/payment/status`,
		{
			method: "POST",
			headers,
			body: JSON.stringify({ paymentID }),
		},
	);

	return (await response.json()) as TBkashExecutePaymentResponse;
};

export const bkash = {
	createPayment,
	executePayment,
	queryPayment,
};
