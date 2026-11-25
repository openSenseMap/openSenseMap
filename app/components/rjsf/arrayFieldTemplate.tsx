import {
	type ArrayFieldItemTemplateProps,
	type ArrayFieldTemplateProps,
	type IconButtonProps,
} from '@rjsf/utils'
import { Trash2 } from 'lucide-react'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '~/components/ui/button'
import { Card, CardContent } from '~/components/ui/card'

export function ArrayFieldRemoveButton(props: IconButtonProps) {
	const { t } = useTranslation('ui-components')
	const {
		icon: _icon,
		iconType: _iconType,
		registry: _registry,
		uiSchema: _uiSchema,
		...buttonProps
	} = props
	const label = t('array_field.remove_item')

	return (
		<Button
			{...buttonProps}
			type="button"
			variant="destructive"
			size="sm"
			aria-label={label}
			title={label}
		>
			<Trash2 aria-hidden="true" />
			{label}
		</Button>
	)
}

export function ArrayFieldItemTemplate({
	children,
	hasToolbar,
	buttonsProps,
	registry,
}: ArrayFieldItemTemplateProps) {
	const Buttons = registry.templates.ArrayFieldItemButtonsTemplate

	return (
		<div className="space-y-3">
			<div>{children}</div>

			{hasToolbar && (
				<div className="flex justify-end border-t pt-3">
					<Buttons {...buttonsProps} />
				</div>
			)}
		</div>
	)
}

export function ArrayFieldTemplate(props: ArrayFieldTemplateProps) {
	const { t } = useTranslation('ui-components')
	const { items, canAdd, onAddClick } = props

	const renderedItems = React.Children.toArray(items)

	return (
		<div className="space-y-3">
			{renderedItems.map((item, index) => (
				<Card key={index}>
					<CardContent className="pt-4">{item}</CardContent>
				</Card>
			))}

			{canAdd && (
				<Button type="button" variant="outline" onClick={onAddClick}>
					{t('array_field.add_item')}
				</Button>
			)}
		</div>
	)
}
