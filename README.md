Scenario:
=========

A developer on our team was working on integrating the TomTom API. They did a great job laying the groundwork, but they've recently been promoted to a new project that requires their full attention.

We are pretty confident the developer managed to complete the majority of the initial part of the integration, however there might be a bug or two to be discovered.

Your task is to finish off this implementation, ensuring the requirements are met with passing tests.


Task:
=====
To take a partial address input and return full address suggestions along with the address broken into its individual components using the TomTom API.


Resources:
==========

Place Search Documentation: https://developer.tomtom.com/search-api/documentation/search-service/search-service
API Key: Oyb0npJAVdRwDauqpFez7zKCy2euUYql

Install:
========
1. yarn install

Test:
=====
1. yarn install
2. yarn test


Requirements:
=============

1. All tests should pass and ensure good coverage for new work
2. We only allow Australian addresses to be returned
3. Code should be maintainable and consistent
4. The result elements should contain important information about the place (country, municipality, etc)
5. The returned result should be typed and easily consumable via users of the library
6. No front-end requirements are necessary, this is purely a backend NodeJS library


Implementation notes:
=====================

- The repository is setup to use [Biome](https://biomejs.dev/) for code linting and formatting. The `yarn run lint` command can be used to run it.
- The library uses [Valibot](https://valibot.dev/) to define the expected response data from the TomTom API and derive TypeScript types - this provides full type safety for the library and consumers.
- The library can hit rate limiting from the TomTom API, returning a HTTP status 429. The `FuzzySearch` class can be used to mitigate this by attempting to retry the failed request and queueing new requests for a configurable `delay` (defaults to 5 seconds).
- Calls to the TomTom API supports a `timeout` and abort `signal` options that are provided to the Axios request.
- Tests are separated in two modules:
  - `unit.test.ts` for tests mocking the TomTom API servers, notably useful to test the `FuzzySearch` class behavior of retrying and queueing requests. The `yarn test unit.test` command can be used to only run these unit tests.
  - `e2e.test.ts` for end-to-end testing with real HTTP calls to the TomTom API server. The `yarn test e2e.test` command can be used to only run these end-to-end tests.
- Tests coverage are generated in the `coverage` folder using `yarn test --coverage`.
- The library can be built using the `yarn run build` command. The compiled JS code and type definitions are output to the `dist` folder and the `package.json` file is configured to reference these files.
- Continuous Integration is setup using GitHub Workflows to build, lint and run the unit tests on Node v22 (latest LTS) and v20 (previous LTS) on commits and pull requests.

Example usage:
==============

Simple one-off request:

```ts
import { getAutoCompleteDetails } from '@montu/maps-backend-challenge'

// Options can be provided as second argument, such as a timeout here
const results = await getAutoCompleteDetails('Charlotte Street', { timeout: 10000 })
```

Using the `FuzzySearch` class allows to better handle concurrency by retrying and queueing requests when hitting limits:

```ts
import { FuzzySearch } from '@montu/maps-backend-challenge'

// All of the constructor options use default values if not provided
const search = new FuzzySearch({
  key: 'API key', // uses the TOMTOM_API_KEY environment variable if not provided
  delay: 3000, // delay before retrying requests in milliseconds, defaults to 5 seconds
})

// Requests will be queued if necessary
await Promise.all([
  search.autoComplete('a first address'),
  search.autoComplete('a second address'),
  search.autoComplete('another address'),
])
```