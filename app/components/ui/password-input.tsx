import { LucideEye, LucideEyeOff } from 'lucide-react'
import * as React from 'react'
import { useTranslation } from 'react-i18next'

import {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupInput,
} from '@/components/ui/input-group'

type PasswordInputProps = Omit<React.ComponentProps<'input'>, 'type'>

const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
	(props, ref) => {
		const { t } = useTranslation('ui-components')
		const [passwordVisible, setPasswordVisible] = React.useState(false)

		return (
			<InputGroup className="h-10">
				<InputGroupInput
					ref={ref}
					{...props}
					type={passwordVisible ? 'text' : 'password'}
				/>
				<InputGroupAddon align="inline-end">
					<InputGroupButton
						size="icon-sm"
						onClick={() => setPasswordVisible((visible) => !visible)}
						aria-label={t(passwordVisible ? 'password.hide' : 'password.show')}
					>
						{passwordVisible ? <LucideEyeOff /> : <LucideEye />}
					</InputGroupButton>
				</InputGroupAddon>
			</InputGroup>
		)
	},
)

PasswordInput.displayName = 'PasswordInput'

export { PasswordInput }
