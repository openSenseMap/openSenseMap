export type SensorLike = {
	id: string
	title?: string
	sensorType?: string
	data?: unknown
}

function isAsciiDigit(character: string): boolean {
	return character >= '0' && character <= '9'
}

function isTitleWordCharacter(character: string | undefined): boolean {
	if (!character) return false

	// Letters change when cased; numeric upload aliases use ASCII digits.
	const isLetter =
		character.toLocaleLowerCase() !== character.toLocaleUpperCase()
	return isLetter || isAsciiDigit(character) || character === '.'
}

/**
 * Preserves legacy compound-title matches such as "Lufttemperatur". Aliases
 * containing digits must be delimited so a short alias such as NC1 cannot
 * match a longer measurement name such as NC10.
 */
function containsLegacyTitleAlias(title: string, alias: string): boolean {
	const aliasContainsDigit = Array.from(alias).some(isAsciiDigit)
	if (!aliasContainsDigit) return title.includes(alias)

	let matchIndex = title.indexOf(alias)
	while (matchIndex !== -1) {
		const characterBefore = title[matchIndex - 1]
		const characterAfter = title[matchIndex + alias.length]
		const hasBoundaries =
			!isTitleWordCharacter(characterBefore) &&
			!isTitleWordCharacter(characterAfter)

		if (hasBoundaries) return true
		matchIndex = title.indexOf(alias, matchIndex + 1)
	}

	return false
}

/**
 * Prefers a single exact title match and only then considers decorated legacy
 * titles. Ambiguous matches are ignored instead of routing to an arbitrary
 * sensor based on database order.
 */
export function findUniqueSensorIdByTitle(
	sensors: SensorLike[],
	exactAliases: readonly string[],
	decoratedAliases: readonly string[],
	ambiguityWarning: string,
): string | undefined {
	const normalizedExactAliases = new Set(
		exactAliases.map((alias) => alias.toLowerCase()),
	)
	const normalizedDecoratedAliases = Array.from(
		new Set(decoratedAliases.map((alias) => alias.toLowerCase())),
	)
	const titledSensors = sensors.filter(
		(sensor): sensor is SensorLike & { title: string } =>
			Boolean(sensor.id) && Boolean(sensor.title),
	)
	const exactMatches = titledSensors.filter((sensor) =>
		normalizedExactAliases.has(sensor.title.toLowerCase()),
	)

	if (exactMatches.length > 1) {
		console.warn(ambiguityWarning)
		return undefined
	}
	if (exactMatches.length === 1) return exactMatches[0].id

	const decoratedMatches = titledSensors.filter((sensor) => {
		const title = sensor.title.toLowerCase()
		return normalizedDecoratedAliases.some((alias) =>
			containsLegacyTitleAlias(title, alias),
		)
	})

	if (decoratedMatches.length > 1) {
		console.warn(ambiguityWarning)
		return undefined
	}

	return decoratedMatches[0]?.id
}
