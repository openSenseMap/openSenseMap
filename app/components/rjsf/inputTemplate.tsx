import { type BaseInputTemplateProps } from '@rjsf/utils'

export function BaseInputTemplate(props: BaseInputTemplateProps) {
	const {
		id,
		value,
		required,
		disabled,
		readonly,
		autofocus,
		onChange,
		onBlur,
		onFocus,
		placeholder,
		type,
	} = props

	return (
		<input
			id={id}
			type={type ?? 'text'}
			value={value ?? ''}
			required={required}
			disabled={disabled || readonly}
			autoFocus={autofocus}
			placeholder={placeholder}
			onChange={(e) => onChange(e.target.value)}
			onBlur={() => onBlur(id, value)}
			onFocus={() => onFocus(id, value)}
			className="border-input bg-background text-foreground ring-offset-background placeholder:text-muted-foreground focus:ring-ring disabled:bg-muted w-full rounded-md border px-3 py-2 text-sm focus:ring-2 focus:outline-hidden disabled:cursor-not-allowed disabled:opacity-50"
		/>
	)
}
