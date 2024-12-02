import axios, { type AxiosError } from 'axios';
import { ValiError } from 'valibot';

import { type SearchResult, parseResponse } from './schema';

// TomTom API search URL - https://developer.tomtom.com/search-api/documentation/search-service/fuzzy-search#request-parameters
const SEARCH_URL = 'https://api.tomtom.com/search/2/search';

// Restrict search to Australia - https://developer.tomtom.com/search-api/documentation/product-information/market-coverage#asiapacific
const COUNTRY_CODE = 'AU' as const;

// Maximum limit supported by the API - https://developer.tomtom.com/search-api/documentation/search-service/fuzzy-search#request-parameters
const MAX_LIMIT = 100;

// Time delay before running requests again after hitting a "Too Many Requests" error - https://developer.tomtom.com/search-api/documentation/search-service/fuzzy-search#response-codes
const DELAY_TIME = 5000; // 5 seconds

// Error thrown when the rate limit API error is returned
export class TooManyRequestsError extends Error {
	constructor() {
		super('Too many requests');
	}
}

// Options for FuzzySearch constructor
export type FuzzySearchOptions = {
	apiKey?: string; // TomTom API key, fallsback to TOMTOM_API_KEY if not provided
	delay?: number; // Delay to apply in milliseconds after a "Too Many Requests" error, default to 5 seconds
	limit?: number; // Limit to the number of results returned by the API, defaults to 100 (max value)
};

// Query parameters sent to the TomTom API
export type AutoCompleteParams = {
	key: string;
	countrySet: typeof COUNTRY_CODE;
	limit: number;
};

// Get the TomTom API parameters to send from the provided options or defaults
// Exported function to simplify testing
export function getParams(
	options: FuzzySearchOptions = {},
): AutoCompleteParams {
	const key = options.apiKey ?? process.env.TOMTOM_API_KEY;
	if (!key) {
		throw new Error('Missing API key or TOMTOM_API_KEY environment variable');
	}
	return {
		key,
		countrySet: COUNTRY_CODE, // Restrict search to Australia
		limit:
			options.limit == null
				? MAX_LIMIT // Default to 100
				: Math.min(Math.max(1, options.limit), MAX_LIMIT), // Ensure limit is between 1 and 100
	};
}

// Auto complete result returned by the API client
export type AutoCompleteResult = {
	placeId: string;
	streetNumber?: string;
	countryCode: string;
	country: string;
	freeformAddress: string;
	municipality?: string;
};

// Convert a TomTom API result to the result type used by the library
// Exported function to simplify testing
export function toAutoCompleteResult(result: SearchResult): AutoCompleteResult {
	const { address, id } = result;
	return {
		placeId: id,
		streetNumber: address.streetNumber,
		countryCode: address.countryCode,
		country: address.country,
		freeformAddress: address.freeformAddress,
		municipality: address.municipality,
	};
}

export type AutoCompleteOptions = {
	signal?: AbortSignal;
	timeout?: number;
};

// Function calling the TomTom API for autocomplete results
export async function getAutoCompleteResults(
	params: AutoCompleteParams,
	address: string,
	options: AutoCompleteOptions = {},
): Promise<Array<AutoCompleteResult>> {
	// Address needs to be URL-encoded
	const query = encodeURIComponent(address);
	try {
		const res = await axios.get(`${SEARCH_URL}/${query}.json`, {
			...options,
			params,
		});
		// Validate response payload and map results to the expected type
		return parseResponse(res.data).results.map(toAutoCompleteResult);
	} catch (err) {
		if (err instanceof ValiError) {
			// Response validation failed, it could be an issue with the returned data or the validation logic being too strict
			throw err;
		}

		// See https://axios-http.com/docs/handling_errors for possible error cases
		const error = err as AxiosError;
		if (error.response?.status === 429) {
			// In case the API rate limit is reached, throw the TooManyRequestsError that will be caught to attempt a retry
			throw new TooManyRequestsError();
		}

		throw error;
	}
}

// Queued request object to process when the rate limiting error is raised
type QueuedRequest = {
	address: string;
	options: AutoCompleteOptions;
	promise: Promise<Array<AutoCompleteResult>>;
	resolve: (results: Array<AutoCompleteResult>) => void;
	reject: (cause: unknown) => void;
};

// Create a QueuedRequest from the provided request arguments
function createQueuedRequest(
	address: string,
	options: AutoCompleteOptions,
): QueuedRequest {
	let resolve: (results: Array<AutoCompleteResult>) => void;
	let reject: (cause: unknown) => void;
	const promise = new Promise<Array<AutoCompleteResult>>((res, rej) => {
		resolve = res;
		reject = rej;
	});
	// @ts-ignore - resolve an reject not actually used before defined
	return { address, options, promise, resolve, reject };
}

// Stateful fuzzy search client managing rate limiting by using an internal queue
export class FuzzySearch {
	#delay: number;
	#params: AutoCompleteParams;
	#queue?: Array<QueuedRequest>;
	#timeout?: NodeJS.Timeout;

	constructor(options: FuzzySearchOptions = {}) {
		this.#delay = options.delay ?? DELAY_TIME;
		this.#params = getParams(options);
	}

	// Expose the internal queue publicly for testing
	get queue(): Array<QueuedRequest> | undefined {
		return this.#queue;
	}

	// Public method to use to run an autocomplete query on the API
	autoComplete(
		address: string,
		options: AutoCompleteOptions = {},
	): Promise<Array<AutoCompleteResult>> {
		const queue = this.#queue;
		// Not currently delaying requests, so we can run the request immediately
		if (queue == null) {
			return this._runAutoComplete(address, options);
		}

		// Add request to the delayed queue and return the promise of the results
		const request = createQueuedRequest(address, options);
		queue.push(request);
		return request.promise;
	}

	// Clear internal queue and timeout if set, to ensure all references are freed for garbage collection
	dispose() {
		this.#queue?.map((req) => {
			req.reject(new Error('Clearing queue'));
		});
		clearTimeout(this.#timeout);
	}

	// Run the autocomplete query on the API and attempt to recover from the
	// "Too Many Requests" error by delaying the query for a short time.
	// This method should be considered private and is only exposed publicly for testing purposes
	async _runAutoComplete(
		address: string,
		options: AutoCompleteOptions,
	): Promise<Array<AutoCompleteResult>> {
		try {
			return await getAutoCompleteResults(this.#params, address, options);
		} catch (err) {
			if (err instanceof TooManyRequestsError) {
				const request = createQueuedRequest(address, options);
				this._handleDelay(request);
				return request.promise;
			}
			// Throw other errors as not recoverable
			throw err;
		}
	}

	// Handle delaying a request after the "Too Many Requests" error is raised by the API
	// This method should be considered private and is only exposed publicly for testing purposes
	_handleDelay(request: QueuedRequest): void {
		if (this.#queue == null) {
			// Create queue with the request
			this.#queue = [request];
			// Add timeout to process the queue
			this.#timeout = setTimeout(() => {
				const queue = this.#queue;
				// Sanity check the queue exists
				if (queue != null) {
					Promise.all(
						queue.map(async (req) => {
							// Run the query to the API and resolve or reject the promise
							// In case of error no further delay is applied, the error will be propagated to the consumer
							try {
								const results = await getAutoCompleteResults(
									this.#params,
									req.address,
									req.options,
								);
								req.resolve(results);
							} catch (err) {
								req.reject(err);
							}
						}),
					);
					// Reset the queue
					this.#queue = undefined;
				}
			}, this.#delay);
		} else {
			this.#queue.push(request);
		}
	}
}
