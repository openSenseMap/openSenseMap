import { eq, and, desc } from 'drizzle-orm'
import {
	type LogEntry,
	logEntry,
	type InsertLogEntry,
} from '~/db/schema/log-entry'
import { drizzleClient } from '~/db.server'

/**
 * Create a new log entry for a device
 */
export async function createLogEntry({
	deviceId,
	content,
	public: isPublic,
}: Pick<InsertLogEntry, 'deviceId' | 'content' | 'public'>) {
	const newLogEntry = await drizzleClient
		.insert(logEntry)
		.values({
			deviceId,
			content,
			public: isPublic, // Default to `false` if not specified
		})
		.returning()

	return newLogEntry[0] // Return the created log entry
}

/**
 * Retrieve log entries for a specific device by its ID
 */
export async function getLogEntriesByDeviceId(deviceId: LogEntry['deviceId']) {
	const logEntries = await drizzleClient
		.select()
		.from(logEntry)
		.where(eq(logEntry.deviceId, deviceId))
		.orderBy(desc(logEntry.createdAt))

	return logEntries
}

/**
 * Retrieve public log entries for a specific device by its ID
 */
export async function getPublicLogEntriesByDeviceId(
	deviceId: LogEntry['deviceId'],
) {
	const publicLogEntries = await drizzleClient
		.select()
		.from(logEntry)
		.where(
			and(
				eq(logEntry.deviceId, deviceId),
				eq(logEntry.public, true), // Combine conditions using `and`
			),
		)
		.orderBy(desc(logEntry.createdAt))

	return publicLogEntries
}

/**
 * Update the visibility of a log entry by its ID
 */
export async function updateLogEntryVisibility(
	logEntryId: string,
	isPublic: boolean,
) {
	const updatedLogEntry = await drizzleClient
		.update(logEntry)
		.set({ public: isPublic }) // Set the new visibility status
		.where(eq(logEntry.id, logEntryId)) // Filter by log entry ID
		.returning() // Return the updated entry

	return updatedLogEntry[0] // Return the updated log entry
}

/**
 * Delete a log entry by its ID
 */
export async function deleteLogEntry(logEntryId: string) {
	await drizzleClient.delete(logEntry).where(eq(logEntry.id, logEntryId))
}
