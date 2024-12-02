import * as v from 'valibot';

const integerSchema = v.pipe(
	v.number(),
	v.integer('The number must be an integer.'),
);

// Defined in: https://developer.tomtom.com/search-api/documentation/search-service/fuzzy-search#latlon
const latLonSchema = v.object({
	lat: v.pipe(v.number(), v.minValue(-90), v.maxValue(90)), // range between -90 and +90
	lon: v.pipe(v.number(), v.minValue(-180), v.maxValue(180)), // range between -180 and +180
});

// Defined in: https://developer.tomtom.com/search-api/documentation/search-service/fuzzy-search#queryIntent
// The "details" field varies based on the "type" field.
const queryIntentSchema = v.variant('type', [
	v.object({
		type: v.literal('COORDINATE'),
		details: latLonSchema,
	}),
	v.object({
		type: v.literal('NEARBY'),
		details: v.object({
			...latLonSchema.entries,
			query: v.string(),
			text: v.string(),
		}),
	}),
	v.object({
		type: v.literal('W3W'),
		details: v.object({ address: v.string() }),
	}),
	v.object({
		type: v.literal('BOOKMARK'),
		details: v.object({ bookmark: v.string() }),
	}),
]);

// Defined in: https://developer.tomtom.com/search-api/documentation/search-service/fuzzy-search#summary-object
const summarySchema = v.object({
	query: v.string(),
	queryType: v.picklist(['NEARBY', 'NON_NEAR'] as const),
	queryTime: integerSchema,
	numResults: integerSchema,
	offset: integerSchema,
	totalResults: integerSchema,
	fuzzyLevel: integerSchema,
	geoBias: v.optional(latLonSchema),
	queryIntent: v.array(queryIntentSchema),
});

// Defined in: https://developer.tomtom.com/search-api/documentation/search-service/fuzzy-search#brands-array
const brandSchema = v.object({
	name: v.string(),
});

// Defined in: https://developer.tomtom.com/search-api/documentation/search-service/fuzzy-search#categoryset-array
const categorySetSchema = v.object({
	id: v.number(),
});

// Defined in: https://developer.tomtom.com/search-api/documentation/search-service/fuzzy-search#starttime-object
// Used for startTime and endTime
const timeObject = v.object({
	date: v.string(),
	hour: v.pipe(v.number(), v.minValue(0), v.maxValue(23)), // range between 0 and 23
	minute: v.pipe(v.number(), v.minValue(0), v.maxValue(59)), // range between 0 and 59
});

// Defined in: https://developer.tomtom.com/search-api/documentation/search-service/fuzzy-search#timeranges-array
const timeRangesArray = v.object({
	startTime: timeObject,
	endTime: timeObject,
});

// Defined in: https://developer.tomtom.com/search-api/documentation/search-service/fuzzy-search#openinghours-object
const openingHoursSchema = v.object({
	mode: v.string(),
	timeRanges: v.array(timeRangesArray),
});

// Defined in: https://developer.tomtom.com/search-api/documentation/search-service/fuzzy-search#names-array
const namesSchema = v.object({
	nameLocale: v.string(),
	name: v.string(),
});

// Defined in: https://developer.tomtom.com/search-api/documentation/search-service/fuzzy-search#classifications-array
const classificationSchema = v.object({
	code: v.string(),
	names: v.array(namesSchema),
});

const timeZoneSchema = v.object({
	ianaId: v.string(),
});

// Defined in: https://developer.tomtom.com/search-api/documentation/search-service/fuzzy-search#results-array
const poiSchema = v.object({
	name: v.string(),
	phone: v.optional(v.string()),
	brands: v.optional(v.array(brandSchema)),
	url: v.optional(v.string()),
	// categories not added as deprecated
	categorySet: v.array(categorySetSchema),
	openingHours: v.optional(openingHoursSchema),
	classifications: v.array(classificationSchema),
	timeZone: v.optional(timeZoneSchema),
});

// Defined in: https://developer.tomtom.com/search-api/documentation/search-service/fuzzy-search#address-object
const addressSchema = v.object({
	streetNumber: v.optional(v.string()),
	streetName: v.string(),
	municipalitySubdivision: v.optional(v.string()),
	municipalitySecondarySubdivision: v.optional(v.string()),
	neighbourhood: v.optional(v.string()),
	municipality: v.optional(v.string()),
	countrySecondarySubdivision: v.optional(v.string()),
	countryTertiarySubdivision: v.optional(v.string()),
	countrySubdivision: v.optional(v.string()),
	postalCode: v.optional(v.string()),
	postalName: v.optional(v.string()), // Only appears with entityType == PostalCodeArea, only for USA
	extendedPostalCode: v.optional(v.string()),
	countryCode: v.pipe(v.string(), v.length(2)), // 2 letters code
	country: v.string(),
	countryCodeISO3: v.pipe(v.string(), v.length(3)), // 3 letters ISO code
	freeformAddress: v.string(),
	countrySubdivisionName: v.optional(v.string()), // Only for USA, Canada, and Great Britain
	countrySubdivisionCode: v.optional(v.string()), // Only appears with entityType == CountrySubdivision
	localName: v.optional(v.string()),
});

// Defined in: https://developer.tomtom.com/search-api/documentation/search-service/fuzzy-search#mapcodes-object
const mapcodeSchema = v.object({
	type: v.picklist(['Local', 'International', 'Alternative']),
	fullMapcode: v.string(),
	territory: v.string(),
	code: v.string(),
});

// Defined in: https://developer.tomtom.com/search-api/documentation/search-service/fuzzy-search#viewport-object
// Used for viewport and boundingBox objects
const viewportSchema = v.object({
	topLeftPoint: latLonSchema,
	btmRightPoint: latLonSchema,
});

// Defined in: https://developer.tomtom.com/search-api/documentation/search-service/fuzzy-search#entrypoints-array
const entryPointSchema = v.object({
	type: v.picklist(['main', 'minor']),
	functions: v.optional(v.array(v.string())),
	position: latLonSchema,
});

// Defined in: https://developer.tomtom.com/search-api/documentation/search-service/fuzzy-search#addressranges-object
const addressRangesSchema = v.object({
	rangeLeft: v.string(),
	rangeRight: v.string(),
	from: latLonSchema,
	to: latLonSchema,
});

// Defined in: https://developer.tomtom.com/search-api/documentation/search-service/fuzzy-search#connectors-array
const connectorSchema = v.object({
	ratedPowerKW: v.number(),
	currentA: integerSchema,
	currentType: v.string(),
	voltageV: integerSchema,
});

// Defined in: https://developer.tomtom.com/search-api/documentation/search-service/fuzzy-search#chargingpark-object
const chargingParkSchema = v.object({
	connectors: v.array(connectorSchema),
});

// Defined in: https://developer.tomtom.com/search-api/documentation/search-service/fuzzy-search#chargingavailability-object
const chargingAvailabilitySchema = v.object({
	id: v.string(),
});

// Defined in: https://developer.tomtom.com/search-api/documentation/search-service/fuzzy-search#parkingavailability-object
const parkingAvailabilitySchema = v.object({
	id: v.string(),
});

// Defined in: https://developer.tomtom.com/search-api/documentation/search-service/fuzzy-search#fuelprice-object
const fuelPriceSchema = v.object({
	id: v.string(),
});

// Defined in: https://developer.tomtom.com/search-api/documentation/search-service/fuzzy-search#geometry-object
const geometrySchema = v.object({
	id: v.string(),
	sourceName: v.optional(v.string()),
});

// Defined in: https://developer.tomtom.com/search-api/documentation/search-service/fuzzy-search#datasources-object
const dataSourceSchema = v.object({
	chargingAvailability: v.optional(chargingAvailabilitySchema), // Only for type == POI
	parkingAvailability: v.optional(parkingAvailabilitySchema), // Only for type == POI
	fuelPrice: v.optional(fuelPriceSchema), // Only for type == POI
	geometry: v.optional(geometrySchema), // Only for type == Geography or type == POI
});

// Common fields present in all result objects
const resultCommonSchema = v.object({
	id: v.string(),
	score: v.number(),
	dist: v.optional(v.number()), // in meters
	info: v.optional(v.string()),
	address: addressSchema,
	position: latLonSchema,
	mapcodes: v.optional(v.array(mapcodeSchema)),
	viewport: viewportSchema,
	entryPoints: v.optional(v.array(entryPointSchema)),
	chargingPark: v.optional(chargingParkSchema),
	dataSources: v.optional(dataSourceSchema),
	fuelTypes: v.optional(v.array(v.string())),
	vehiculeTypes: v.optional(v.array(v.picklist(['Car', 'Truck']))),
});

// Defined in: https://developer.tomtom.com/search-api/documentation/search-service/fuzzy-search#results-array
const resultSchema = v.variant('type', [
	v.object({
		type: v.literal('POI'),
		...resultCommonSchema.entries,
		poi: poiSchema,
	}),
	v.object({
		type: v.literal('Geography'),
		...resultCommonSchema.entries,
		entityType: v.picklist([
			'Country',
			'CountrySubdivision',
			'CountrySecondarySubdivision',
			'CountryTertiarySubdivision',
			'Municipality',
			'MunicipalitySubdivision',
			'MunicipalitySecondarySubdivision',
			'Neighbourhood',
			'PostalCodeArea',
		]),
		boundingBox: viewportSchema,
	}),
	v.object({
		type: v.literal('Address Range'),
		...resultCommonSchema.entries,
		addressRanges: addressRangesSchema,
	}),
	v.object({
		type: v.picklist(['Street', 'Point Address', 'Cross Street']),
		...resultCommonSchema.entries,
	}),
]);

export type SearchResult = v.InferOutput<typeof resultSchema>;

// Defined in: https://developer.tomtom.com/search-api/documentation/search-service/fuzzy-search#response-body---json
export const responseSchema = v.object({
	summary: summarySchema,
	results: v.array(resultSchema),
});

export type SearchResponse = v.InferOutput<typeof responseSchema>;

export function parseResponse(data: unknown): SearchResponse {
	return v.parse(responseSchema, data);
}
