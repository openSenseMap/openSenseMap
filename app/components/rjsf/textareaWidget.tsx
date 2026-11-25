import { type WidgetProps } from '@rjsf/utils'

export function TextareaWidget(props: WidgetProps) {
	return (
		<textarea
			id={props.id}
			value={props.value ?? ''}
			onChange={(e) => props.onChange(e.target.value)}
			rows={4}
			className="border-input bg-background text-foreground ring-offset-background placeholder:text-muted-foreground focus:ring-ring disabled:bg-muted w-full rounded-md border px-3 py-2 text-sm focus:ring-2 focus:outline-hidden disabled:cursor-not-allowed disabled:opacity-50"
		/>
	)
}
