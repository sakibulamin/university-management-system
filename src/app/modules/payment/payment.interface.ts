// NOTE: no Fee/FeeStructure model exists in the Phase 3 schema, so the
// amount to be paid has no server-side source of truth — it must be
// client-supplied here. Flagged as a real integrity gap in the Phase 11 plan.
export interface IInitiatePaymentPayload {
	amount: number;
	purpose?: string;
}

export interface IPaymentCallbackPayload {
	paymentID: string;
}

export interface IPaymentFilters {
	status?: string;
	page?: string;
	limit?: string;
	sortBy?: string;
	sortOrder?: string;
}
