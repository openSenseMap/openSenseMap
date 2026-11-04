import { type WidgetProps } from '@rjsf/utils'

export function NumberWidget(props: WidgetProps) {
	return (
		<input
			id={props.id}
			type="number"
			value={props.value ?? ''}
			onChange={(e) => props.onChange(e.target.valueAsNumber || undefined)}
			disabled={props.disabled || props.readonly}
			min={props.schema.minimum}
			max={props.schema.maximum}
			className="border-input bg-background text-foreground ring-offset-background placeholder:text-muted-foreground focus:ring-ring disabled:bg-muted w-full rounded-md border px-3 py-2 text-sm focus:ring-2 focus:outline-hidden disabled:cursor-not-allowed disabled:opacity-50"
		/>
	)
}
