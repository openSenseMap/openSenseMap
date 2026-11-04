import { type FieldTemplateProps } from '@rjsf/utils'

export function FieldTemplate(props: FieldTemplateProps) {
	const {
		id,
		classNames,
		style,
		label,
		required,
		errors,
		children,
		hidden,
		displayLabel,
	} = props

	if (hidden) {
		return <div className="hidden">{children}</div>
	}

	return (
		<div className={classNames} style={style}>
			{displayLabel && label && (
				<label
					htmlFor={id}
					className="text-foreground mb-1 block text-sm font-medium"
				>
					{label}
					{required && <span className="text-red-500">*</span>}
				</label>
			)}

			{children}

			{errors && <div className="mt-1 text-sm text-red-600">{errors}</div>}
		</div>
	)
}
