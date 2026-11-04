import { StandardResponse } from '~/lib/responses'

export const loader = async () => {
	return StandardResponse.notFound('Not Found')
}

export default function NotFound() {
	return <h1 className="text-center text-9xl">404</h1>
}
