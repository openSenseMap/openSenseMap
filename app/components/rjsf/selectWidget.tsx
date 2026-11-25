import { type WidgetProps } from '@rjsf/utils'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '~/components/ui/select'

export function SelectWidget(props: WidgetProps) {
	const {
		id,
		value,
		required,
		disabled,
		readonly,
		onChange,
		options,
		placeholder,
	} = props

	return (
		<Select
			value={value || ''}
			onValueChange={onChange}
			disabled={disabled || readonly}
			required={required}
		>
			<SelectTrigger id={id}>
				<SelectValue placeholder={placeholder || 'Select an option'} />
			</SelectTrigger>
			<SelectContent>
				{options.enumOptions?.map((option) => (
					<SelectItem key={option.value} value={String(option.value)}>
						{option.label}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	)
}
