import { describe, it, expect } from 'vite-plus/test'
import {
	parseRequestData,
	parseUserRegistrationData,
	parseUserSignInData,
	parseRefreshTokenData,
} from '~/lib/request-parsing'

describe('parseRequestData', () => {
	it('should parse JSON data when content-type is application/json', async () => {
		const jsonData = { name: 'john', email: 'john@example.com' }
		const request = new Request('http://localhost', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(jsonData),
		})

		const result = await parseRequestData(request)
		expect(result).toEqual(jsonData)
	})

	it('should parse form data when content-type is multipart/form-data', async () => {
		// Create a proper multipart form data body
		const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW'
		const body =
			`--${boundary}\r\n` +
			`Content-Disposition: form-data; name="name"\r\n\r\n` +
			`john\r\n` +
			`--${boundary}\r\n` +
			`Content-Disposition: form-data; name="email"\r\n\r\n` +
			`john@example.com\r\n` +
			`--${boundary}--\r\n`

		const request = new Request('http://localhost', {
			method: 'POST',
			headers: { 'content-type': `multipart/form-data; boundary=${boundary}` },
			body: body,
		})

		const result = await parseRequestData(request)
		expect(result).toEqual({
			name: 'john',
			email: 'john@example.com',
		})
	})

	it('should throw error for invalid JSON', async () => {
		const request = new Request('http://localhost', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: 'invalid json',
		})

		await expect(parseRequestData(request)).rejects.toThrow(
			'Failed to parse JSON data',
		)
	})
})

describe('parseUserRegistrationData', () => {
	it('should parse JSON registration data', async () => {
		const jsonData = {
			name: 'john_doe',
			email: 'john@example.com',
			password: 'password123',
			language: 'de_DE',
			tosAccepted: true,
			newsletterOptIn: true,
		}
		const request = new Request('http://localhost', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(jsonData),
		})

		const result = await parseUserRegistrationData(request)
		expect(result).toEqual({
			name: 'john_doe',
			email: 'john@example.com',
			password: 'password123',
			language: 'de_DE',
			tosAccepted: true,
			newsletterOptIn: true,
		})
	})

	it('should use default values for missing fields', async () => {
		const jsonData = {
			name: 'john_doe',
			email: 'john@example.com',
			password: 'password123',
			tosAccepted: true,
		}
		const request = new Request('http://localhost', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(jsonData),
		})

		const result = await parseUserRegistrationData(request)
		expect(result).toEqual({
			name: 'john_doe',
			email: 'john@example.com',
			password: 'password123',
			language: 'en_US',
			tosAccepted: true,
			newsletterOptIn: false,
		})
	})

	it('should parse form checkbox values for registration consent fields', async () => {
		const formData = new URLSearchParams({
			name: 'john_doe',
			email: 'john@example.com',
			password: 'password123',
			tosAccepted: 'on',
			newsletterOptIn: 'on',
		})
		const request = new Request('http://localhost', {
			method: 'POST',
			headers: { 'content-type': 'application/x-www-form-urlencoded' },
			body: formData.toString(),
		})

		const result = await parseUserRegistrationData(request)
		expect(result).toEqual({
			name: 'john_doe',
			email: 'john@example.com',
			password: 'password123',
			language: 'en_US',
			tosAccepted: true,
			newsletterOptIn: true,
		})
	})
})

describe('parseUserSignInData', () => {
	it('should parse JSON sign-in data', async () => {
		const jsonData = {
			email: 'john@example.com',
			password: 'password123',
		}
		const request = new Request('http://localhost', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(jsonData),
		})

		const result = await parseUserSignInData(request)
		expect(result).toEqual({
			email: 'john@example.com',
			password: 'password123',
		})
	})
})

describe('parseRefreshTokenData', () => {
	it('should parse JSON refresh token data', async () => {
		const jsonData = { token: 'refresh_token_123' }
		const request = new Request('http://localhost', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(jsonData),
		})

		const result = await parseRefreshTokenData(request)
		expect(result).toEqual({
			token: 'refresh_token_123',
		})
	})

	it('should parse form data refresh token', async () => {
		const urlEncodedData = 'token=refresh_token_456'

		const request = new Request('http://localhost', {
			method: 'POST',
			headers: { 'content-type': 'application/x-www-form-urlencoded' },
			body: urlEncodedData,
		})

		const result = await parseRefreshTokenData(request)
		expect(result).toEqual({
			token: 'refresh_token_456',
		})
	})

	it('should use default empty string for missing token field', async () => {
		const jsonData = {}
		const request = new Request('http://localhost', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(jsonData),
		})

		const result = await parseRefreshTokenData(request)
		expect(result).toEqual({
			token: '',
		})
	})

	it('should handle multipart form data', async () => {
		const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW'
		const body =
			`--${boundary}\r\n` +
			`Content-Disposition: form-data; name="token"\r\n\r\n` +
			`refresh_token_multipart\r\n` +
			`--${boundary}--\r\n`

		const request = new Request('http://localhost', {
			method: 'POST',
			headers: { 'content-type': `multipart/form-data; boundary=${boundary}` },
			body: body,
		})

		const result = await parseRefreshTokenData(request)
		expect(result).toEqual({
			token: 'refresh_token_multipart',
		})
	})

	it('should handle different field names and map to token', async () => {
		const jsonData = { refreshToken: 'refresh_token_field_name' }
		const request = new Request('http://localhost', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(jsonData),
		})

		const result = await parseRefreshTokenData(request)
		// Should return empty string since we only look for 'token' field
		expect(result).toEqual({
			token: '',
		})
	})
})
