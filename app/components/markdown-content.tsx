import Markdown from 'markdown-to-jsx'

type MarkdownContentProps = {
	children: string
	className?: string
}

export function MarkdownContent({
	children,
	className = '',
}: MarkdownContentProps) {
	return (
		<div
			className={`prose dark:prose-invert max-w-none min-w-0 overflow-x-hidden wrap-anywhere ${className}`}
		>
			<Markdown
				options={{
					overrides: {
						h1: {
							component: ({ children, className, ...props }) => (
								<h1
									className={`mb-4 text-3xl font-bold ${className ?? ''}`}
									{...props}
								>
									{children}
								</h1>
							),
						},
						h2: {
							component: ({ children, className, ...props }) => (
								<h2
									className={`mt-8 mb-3 text-2xl font-semibold ${className ?? ''}`}
									{...props}
								>
									{children}
								</h2>
							),
						},
						h3: {
							component: ({ children, className, ...props }) => (
								<h3
									className={`mt-6 mb-2 text-xl font-semibold ${className ?? ''}`}
									{...props}
								>
									{children}
								</h3>
							),
						},
						p: {
							component: ({ children, className, ...props }) => (
								<p className={`mb-3 leading-7 ${className ?? ''}`} {...props}>
									{children}
								</p>
							),
						},
						ul: {
							component: ({ children, className, ...props }) => (
								<ul
									className={`mb-4 list-disc pl-6 ${className ?? ''}`}
									{...props}
								>
									{children}
								</ul>
							),
						},
						ol: {
							component: ({ children, className, ...props }) => (
								<ol
									className={`mb-4 list-decimal pl-6 ${className ?? ''}`}
									{...props}
								>
									{children}
								</ol>
							),
						},
						li: {
							component: ({ children, className, ...props }) => (
								<li className={`mb-1 leading-7 ${className ?? ''}`} {...props}>
									{children}
								</li>
							),
						},
						strong: {
							component: ({ children, className, ...props }) => (
								<strong
									className={`font-semibold ${className ?? ''}`}
									{...props}
								>
									{children}
								</strong>
							),
						},
						hr: {
							component: ({ className, ...props }) => (
								<hr
									className={`border-border my-6 ${className ?? ''}`}
									{...props}
								/>
							),
						},
						blockquote: {
							component: ({ children, className, ...props }) => (
								<blockquote
									className={`text-muted-foreground my-4 border-l-4 pl-4 italic ${className ?? ''}`}
									{...props}
								>
									{children}
								</blockquote>
							),
						},
						a: {
							component: ({ children, href, className, ...props }) => (
								<a
									href={href}
									className={`underline underline-offset-2 ${className ?? ''}`}
									target="_blank"
									rel="noreferrer"
									{...props}
								>
									{children}
								</a>
							),
						},
					},
				}}
			>
				{children}
			</Markdown>
		</div>
	)
}
