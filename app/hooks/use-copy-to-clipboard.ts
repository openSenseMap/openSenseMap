import { useCallback, useRef, useState } from 'react'

export function useCopyToClipboard(resetAfter = 2000) {
	const [copiedToClipboard, setCopiedToClipboard] = useState(false)
	const [copiedValue, setCopiedValue] = useState<string | null>(null)
	const resetTimeoutRef = useRef<number | null>(null)

	const copyToClipboard = useCallback(
		async (value: string | undefined | null) => {
			if (!value) return false

			await navigator.clipboard.writeText(value)

			setCopiedToClipboard(true)
			setCopiedValue(value)

			if (resetTimeoutRef.current) {
				window.clearTimeout(resetTimeoutRef.current)
			}

			resetTimeoutRef.current = window.setTimeout(() => {
				setCopiedToClipboard(false)
				setCopiedValue(null)
			}, resetAfter)

			return true
		},
		[resetAfter],
	)

	return {
		copiedToClipboard,
		copiedValue,
		copyToClipboard,
	}
}
