import {
	type AutoCompleteOptions,
	type AutoCompleteResult,
	getAutoCompleteResults,
	getParams,
} from './maps-api';

export {
	type AutoCompleteOptions,
	type AutoCompleteResult,
	FuzzySearch,
	type FuzzySearchOptions,
} from './maps-api';

export async function getAutoCompleteDetails(
	address: string,
	options?: AutoCompleteOptions,
): Promise<Array<AutoCompleteResult>> {
	// Use default parameters
	const params = getParams();
	return await getAutoCompleteResults(params, address, options);
}
