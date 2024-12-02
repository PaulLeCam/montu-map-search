import { describe } from '@jest/globals';
import { config } from 'dotenv';
import { getAutoCompleteDetails } from '../src';
import {
	type AutoCompleteParams,
	FuzzySearch,
	getAutoCompleteResults,
} from '../src/maps-api';

config();

// These are end-to-end tests and need an api key
describe('Tomtom Places E2E Tests', () => {
	describe('getAutoCompleteDetails', () => {
		it('returns a promise', () => {
			const res = getAutoCompleteDetails('Charlotte Street');
			expect(res).toBeInstanceOf(Promise);
		});

		it('can fetch from the autocomplete api', async () => {
			const res = await getAutoCompleteDetails('Charlotte Street');
			const firstRes = res[0];
			expect(firstRes).toHaveProperty('placeId');
			expect(firstRes).toHaveProperty('streetNumber');
			expect(firstRes).toHaveProperty('countryCode');
			expect(firstRes).toHaveProperty('country');
			expect(firstRes).toHaveProperty('freeformAddress');
			expect(firstRes).toHaveProperty('municipality');
		});
	});

	describe('getAutoCompleteResults', () => {
		const params: AutoCompleteParams = {
			key: process.env.TOMTOM_API_KEY as string,
			countrySet: 'AU',
			limit: 10,
		};

		it('handles no results', async () => {
			const res = await getAutoCompleteResults(params, 'asfasffasfasafsafs');
			expect(res).toStrictEqual([]);
		});

		it('handles error', async () => {
			await expect(getAutoCompleteResults(params, '')).rejects.toThrow(
				'Request failed with status code 400',
			);
		});
	});

	describe('FuzzySearch#autoComplete', () => {
		const search = new FuzzySearch({ delay: 500 });
		afterAll(() => {
			search.dispose();
		});

		it('handles no results', async () => {
			const res = await search.autoComplete('asfasffasfasafsafs');
			expect(res).toStrictEqual([]);
		});

		it('handles error', async () => {
			await expect(search.autoComplete('')).rejects.toThrow(
				'Request failed with status code 400',
			);
		});
	});
});
