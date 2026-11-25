import { Form } from 'react-router'
import { Separator } from '~/components/ui/separator'

export default function NotificationsPage() {
	return (
		<div className="space-y-6">
			<div>
				<h3 className="text-lg font-medium">Notifications</h3>
				<p className="text-muted-foreground text-sm">
					Configure how you receive notifications.
				</p>
			</div>
			<Separator />
			<Form></Form>
		</div>
	)
}
