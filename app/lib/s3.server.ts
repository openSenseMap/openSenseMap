import { randomUUID } from 'node:crypto'
import {
	DeleteObjectCommand,
	GetObjectCommand,
	PutObjectCommand,
	S3Client,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { logServerError } from '~/lib/sentry.server'

type ImageKind = 'device' | 'profile'
type StorageOperation = 'delete' | 'presign' | 'upload'

const PROFILE_IMAGE_EXTENSIONS: Record<string, string> = {
	'image/jpeg': 'jpg',
	'image/png': 'png',
	'image/webp': 'webp',
}

const DEVICE_IMAGE_EXTENSIONS: Record<string, string> = {
	...PROFILE_IMAGE_EXTENSIONS,
	'image/gif': 'gif',
}

function hasExpectedImageSignature(contentType: string, buffer: Buffer) {
	switch (contentType) {
		case 'image/jpeg':
			return (
				buffer.length >= 3 &&
				buffer[0] === 0xff &&
				buffer[1] === 0xd8 &&
				buffer[2] === 0xff
			)
		case 'image/png':
			return (
				buffer.length >= 8 &&
				buffer
					.subarray(0, 8)
					.equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
			)
		case 'image/webp':
			return (
				buffer.length >= 12 &&
				buffer.toString('ascii', 0, 4) === 'RIFF' &&
				buffer.toString('ascii', 8, 12) === 'WEBP'
			)
		case 'image/gif':
			return (
				buffer.length >= 6 &&
				['GIF87a', 'GIF89a'].includes(buffer.toString('ascii', 0, 6))
			)
		default:
			return false
	}
}

let s3Client: S3Client | undefined

function requireStorageVariable(name: keyof NodeJS.ProcessEnv): string {
	const value = process.env[name]
	if (!value) throw new Error(`${name} must be configured`)
	return value
}

function getS3Client(): S3Client {
	if (s3Client) return s3Client

	s3Client = new S3Client({
		endpoint: requireStorageVariable('S3_ENDPOINT').replace(/\/$/, ''),
		region: requireStorageVariable('S3_REGION'),
		credentials: {
			accessKeyId: requireStorageVariable('S3_ACCESS_KEY'),
			secretAccessKey: requireStorageVariable('S3_SECRET_KEY'),
		},
		forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
	})

	return s3Client
}

function getBucketName(): string {
	return requireStorageVariable('S3_BUCKET')
}

async function runImageStorageOperation<T>(
	imageKind: ImageKind,
	operation: StorageOperation,
	callback: () => Promise<T>,
): Promise<T> {
	try {
		return await callback()
	} catch (error) {
		logServerError('Image storage operation failed', error, {
			'app.operation': `${imageKind}_image.${operation}`,
			'storage.image.kind': imageKind,
			'storage.provider': 's3',
		})
		throw error
	}
}

async function getImageUrl(imageKind: ImageKind, key: string) {
	return runImageStorageOperation(imageKind, 'presign', () =>
		getSignedUrl(
			getS3Client(),
			new GetObjectCommand({
				Bucket: getBucketName(),
				Key: key,
			}),
			{ expiresIn: 60 * 60 },
		),
	)
}

async function deleteImage(imageKind: ImageKind, key: string): Promise<void> {
	if (!key) return

	await runImageStorageOperation(imageKind, 'delete', () =>
		getS3Client().send(
			new DeleteObjectCommand({
				Bucket: getBucketName(),
				Key: key,
			}),
		),
	)
}

export async function uploadDeviceImage(
	deviceId: string,
	file: File,
): Promise<string> {
	return runImageStorageOperation('device', 'upload', async () => {
		const extension = DEVICE_IMAGE_EXTENSIONS[file.type]
		if (!extension) {
			throw new Error(
				`Unsupported device image type: ${file.type || 'unknown'}`,
			)
		}

		const buffer = Buffer.from(await file.arrayBuffer())
		if (!hasExpectedImageSignature(file.type, buffer)) {
			throw new Error('Device image content does not match its declared type')
		}
		const key = `devices/${deviceId}/${randomUUID()}.${extension}`

		await getS3Client().send(
			new PutObjectCommand({
				Bucket: getBucketName(),
				Key: key,
				Body: buffer,
				ContentType: file.type,
				CacheControl: 'private, max-age=31536000, immutable',
			}),
		)

		return key
	})
}

export async function getDeviceImageUrl(key: string): Promise<string> {
	return getImageUrl('device', key)
}

export async function deleteDeviceImage(key: string): Promise<void> {
	if (!key.startsWith('devices/')) return
	await deleteImage('device', key)
}

export async function uploadProfileImage(
	profileId: string,
	file: File,
): Promise<string> {
	return runImageStorageOperation('profile', 'upload', async () => {
		const extension = PROFILE_IMAGE_EXTENSIONS[file.type]
		if (!extension) {
			throw new Error(
				`Unsupported profile image type: ${file.type || 'unknown'}`,
			)
		}

		const buffer = Buffer.from(await file.arrayBuffer())
		if (!hasExpectedImageSignature(file.type, buffer)) {
			throw new Error('Profile image content does not match its declared type')
		}
		const key = `profiles/${profileId}/${randomUUID()}.${extension}`

		await getS3Client().send(
			new PutObjectCommand({
				Bucket: getBucketName(),
				Key: key,
				Body: buffer,
				ContentType: file.type,
				CacheControl: 'private, max-age=31536000, immutable',
			}),
		)

		return key
	})
}

export async function getProfileImageUrl(key: string): Promise<string> {
	return getImageUrl('profile', key)
}

export async function deleteProfileImage(key: string): Promise<void> {
	if (!key.startsWith('profiles/')) return
	await deleteImage('profile', key)
}
