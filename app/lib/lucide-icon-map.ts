import * as LucideIcons from 'lucide-react'
import { type LucideIcon } from 'lucide-react'

const iconMap = LucideIcons as unknown as Record<string, LucideIcon>

export function getLucideIcon(name?: string | null): LucideIcon {
	if (!name) {
		return LucideIcons.Plug
	}

	return iconMap[name] ?? LucideIcons.Plug
}
