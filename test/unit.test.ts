jest.mock('axios');

import axios, { AxiosError } from 'axios';
import { ValiError } from 'valibot';
import {
	type AutoCompleteResult,
	FuzzySearch,
	TooManyRequestsError,
	getAutoCompleteResults,
	getParams,
	toAutoCompleteResult,
} from '../src/maps-api';
import type { SearchResponse } from '../src/schema';

const mockedAxios = axios as jest.Mocked<typeof axios>;

// Valid response from the TomTom API
const VALID_RESPONSE: SearchResponse = {
	summary: {
		query: 'Test address',
		queryType: 'NEARBY',
		queryTime: 100,
		numResults: 2,
		offset: 0,
		totalResults: 2,
		fuzzyLevel: 1,
		queryIntent: [],
	},
	results: [
		{
			id: 'test1',
			type: 'Street',
			address: {
				streetName: 'Test street 1',
				country: 'Australia',
				countryCode: 'AU',
				countryCodeISO3: 'AUS',
				freeformAddress: 'First test street',
			},
			position: { lat: -25, lon: 133 },
			score: 1,
			viewport: {
				topLeftPoint: { lat: -25, lon: 133 },
				btmRightPoint: { lat: -25, lon: 133 },
			},
		},
		{
			id: 'test2',
			type: 'Street',
			address: {
				streetName: 'Test street 2',
				country: 'Australia',
				countryCode: 'AU',
				countryCodeISO3: 'AUS',
				freeformAddress: 'Second test street',
			},
			position: { lat: -25, lon: 133 },
			score: 1,
			viewport: {
				topLeftPoint: { lat: -25, lon: 133 },
				btmRightPoint: { lat: -25, lon: 133 },
			},
		},
	],
};

// Expected results from the library
const VALID_RESULTS: Array<AutoCompleteResult> = [
	{
		placeId: 'test1',
		streetNumber: undefined,
		countryCode: 'AU',
		country: 'Australia',
		freeformAddress: 'First test street',
		municipality: undefined,
	},
	{
		placeId: 'test2',
		streetNumber: undefined,
		countryCode: 'AU',
		country: 'Australia',
		freeformAddress: 'Second test street',
		municipality: undefined,
	},
];

describe('getParams()', () => {
	it('returns the expected params with the provided API key', () => {
		expect(getParams({ apiKey: 'test' })).toEqual({
			key: 'test',
			countrySet: 'AU',
			limit: 100,
		});
	});

	it('throw is the API key is not provided and not present in environment variables', () => {
		const originalKey = process.env.TOMTOM_API_KEY;
		process.env.TOMTOM_API_KEY = '';
		expect(() => getParams({})).toThrow(
			'Missing API key or TOMTOM_API_KEY environment variable',
		);
		// Restore environment variable
		process.env.TOMTOM_API_KEY = originalKey;
	});

	it('gets the API key from environment variables if not provided', () => {
		const originalKey = process.env.TOMTOM_API_KEY;
		process.env.TOMTOM_API_KEY = 'test';
		expect(getParams({})).toEqual({
			key: 'test',
			countrySet: 'AU',
			limit: 100,
		});
		// Restore environment variable
		process.env.TOMTOM_API_KEY = originalKey;
	});

	it('ensures the limit is not greater than 100', () => {
		expect(getParams({ apiKey: 'test', limit: 200 })).toEqual({
			key: 'test',
			countrySet: 'AU',
			limit: 100,
		});
	});

	it('ensures the limit is not lower than 1', () => {
		expect(getParams({ apiKey: 'test', limit: 0 })).toEqual({
			key: 'test',
			countrySet: 'AU',
			limit: 1,
		});
	});
});

describe('toAutoCompleteResult()', () => {
	it('converts a TomTom API result object to a library result object', () => {
		expect(
			toAutoCompleteResult({
				id: 'test',
				type: 'Street',
				address: {
					streetName: 'Test street',
					country: 'Australia',
					countryCode: 'AU',
					countryCodeISO3: 'AUS',
					freeformAddress: 'Some test street in Australia',
				},
				position: { lat: -25, lon: 133 },
				score: 1,
				viewport: {
					topLeftPoint: { lat: -25, lon: 133 },
					btmRightPoint: { lat: -25, lon: 133 },
				},
			}),
		).toEqual({
			placeId: 'test',
			streetNumber: undefined,
			countryCode: 'AU',
			country: 'Australia',
			freeformAddress: 'Some test street in Australia',
			municipality: undefined,
		});
	});
});

describe('getAutoCompleteResults()', () => {
	it('calls the TomTom API endpoint with the expected parameters', async () => {
		const params = getParams({ apiKey: 'test' });

		mockedAxios.get.mockImplementation((url, config) => {
			// Check query is URL-encoded
			expect(url).toBe(
				'https://api.tomtom.com/search/2/search/Test%20address.json',
			);
			// Check params are provided
			expect(config).toEqual({ params });
			// Return a valid response
			return Promise.resolve({ data: VALID_RESPONSE });
		});

		await expect(
			getAutoCompleteResults(params, 'Test address'),
		).resolves.toEqual(VALID_RESULTS);
	});

	it('throws a ValiError if the response validation fails', async () => {
		// Return an invalid response
		mockedAxios.get.mockResolvedValueOnce({
			data: {
				summary: {},
				results: [],
			},
		});
		await expect(
			getAutoCompleteResults(getParams({ apiKey: 'test' }), 'Test address'),
		).rejects.toBeInstanceOf(ValiError);
	});

	it('throws a TooManyRequestsError if the API returns a 429 status code', async () => {
		// Return a rate limited status code
		mockedAxios.get.mockRejectedValueOnce({
			response: {
				status: 429,
			},
		});
		await expect(
			getAutoCompleteResults(getParams({ apiKey: 'test' }), 'Test address'),
		).rejects.toBeInstanceOf(TooManyRequestsError);
	});

	it('throws an AxiosError if the request fails for other reasons than rate limiting', async () => {
		// Return an AxiosError
		mockedAxios.get.mockRejectedValueOnce(new AxiosError('Failed'));
		await expect(
			getAutoCompleteResults(getParams({ apiKey: 'test' }), 'Test address'),
		).rejects.toBeInstanceOf(AxiosError);
	});
});

describe('FuzzySearch', () => {
	it('provides the autoComplete() method', async () => {
		mockedAxios.get.mockImplementation((url, config) => {
			// Check query is URL-encoded
			expect(url).toBe(
				'https://api.tomtom.com/search/2/search/Test%20address.json',
			);
			// Check params are provided
			expect(config).toEqual({
				params: { key: 'test', countrySet: 'AU', limit: 10 },
			});
			// Return a valid response
			return Promise.resolve({ data: VALID_RESPONSE });
		});

		const search = new FuzzySearch({ apiKey: 'test', limit: 10 });

		await expect(search.autoComplete('Test address')).resolves.toEqual(
			VALID_RESULTS,
		);
	});

	describe('handles delaying and retrying requests when possible', () => {
		it('adds the request to the queue after a "Too Many Requests" error', async () => {
			let sendError = true;
			mockedAxios.get.mockReset();
			mockedAxios.get.mockImplementation(() => {
				if (sendError) {
					sendError = false;
					return Promise.reject({
						response: {
							status: 429,
						},
					});
				}
				return Promise.resolve({ data: VALID_RESPONSE });
			});

			// 500ms delay applied for rate limiting rather than 5s default
			const search = new FuzzySearch({ apiKey: 'test', delay: 500 });
			await expect(search.autoComplete('Test address')).resolves.toEqual(
				VALID_RESULTS,
			);
			expect(mockedAxios.get).toHaveBeenCalledTimes(2);
		});

		it('adds requests to the queue when delaying', async () => {
			let sendError = true;
			mockedAxios.get.mockReset();
			mockedAxios.get.mockImplementation(() => {
				if (sendError) {
					sendError = false;
					return Promise.reject({
						response: {
							status: 429,
						},
					});
				}
				return Promise.resolve({ data: VALID_RESPONSE });
			});

			// 500ms delay applied for rate limiting rather than 5s default
			const search = new FuzzySearch({ apiKey: 'test', delay: 500 });

			const firstRequest = search.autoComplete('Test address');
			// Wait for the request to have been executed and the queue created
			await new Promise((resolve) => {
				setTimeout(resolve, 100);
			});
			// Check the request has been added to the queue
			expect(search.queue).toHaveLength(1);
			expect(search.queue?.[0]?.address).toBe('Test address');

			const otherRequests = [
				search.autoComplete('Test address 1'),
				search.autoComplete('Test address 2'),
				search.autoComplete('Test address 3'),
			];
			expect(search.queue).toHaveLength(4);
			expect((search.queue ?? []).map(({ address }) => address)).toEqual([
				'Test address',
				'Test address 1',
				'Test address 2',
				'Test address 3',
			]);

			await expect(firstRequest).resolves.toEqual(VALID_RESULTS);
			await expect(Promise.all(otherRequests)).resolves.toEqual([
				VALID_RESULTS,
				VALID_RESULTS,
				VALID_RESULTS,
			]);
			// Check queue is removed after the all the requests have been resolved
			expect(search.queue).toBeUndefined();
			// Check there was 5 requests to the API: 1 initial with error + 1 retry + 3 queued
			expect(mockedAxios.get).toHaveBeenCalledTimes(5);
		});

		it('throws an error if the request fails after retrying', async () => {
			mockedAxios.get.mockReset();
			mockedAxios.get.mockRejectedValue({
				response: {
					status: 429,
				},
			});

			// 500ms delay applied for rate limiting rather than 5s default
			const search = new FuzzySearch({ apiKey: 'test', delay: 500 });
			await expect(search.autoComplete('Test address')).rejects.toThrow(
				TooManyRequestsError,
			);
			// The API should have been called twice: initial request + retry
			expect(mockedAxios.get).toHaveBeenCalledTimes(2);
		});
	});
});
