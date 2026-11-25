import { type WidgetProps } from '@rjsf/utils'
import { Checkbox } from '@/components/ui/checkbox'

export function CheckboxWidget({ value, onChange, label }: WidgetProps) {
	return (
		<div className="flex items-center gap-2">
			<Checkbox checked={Boolean(value)} onCheckedChange={onChange} />
			<span className="text-sm">{label}</span>
		</div>
	)
}
