import { z } from 'zod'

export const generalInfoSchema = z.object({
	name: z
		.string()
		.trim()
		.min(1, 'Name is required')
		.min(2, 'Name must be at least 2 characters')
		.max(100, 'Name must not exceed 100 characters'),

	description: z
		.string()
		.max(5000, 'Description should not exceed 5000 characters')
		.optional()
		.nullable(),

	exposure: z.enum(['indoor', 'outdoor', 'mobile', 'unknown'], {
		error: () => 'Exposure is required',
	}),

	temporaryExpirationDate: z
		.string()
		.optional()
		.transform((date) => (date ? new Date(date) : undefined))
		.refine(
			(date) =>
				!date || date <= new Date(Date.now() + 31 * 24 * 60 * 60 * 1000),
			{
				message: 'Temporary expiration date must be within 1 month from now',
			},
		),

	tags: z
		.array(
			z.object({
				value: z.string(),
			}),
		)
		.optional(),
})

export type GeneralInfoData = z.infer<typeof generalInfoSchema>

export type GeneralInfoErrors = {
	form?: string
	name?: string
	description?: string
	exposure?: string
	temporaryExpirationDate?: string
	tags?: string
}
