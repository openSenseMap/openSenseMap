'use client'

import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function ColorPicker({
	handleColorChange,
	colorPickerState,
	setColorPickerState,
}: {
	handleColorChange: (color: string, index: number) => void
	colorPickerState: {
		open: boolean
		index: number
		color: string
	}
	setColorPickerState: (state: {
		open: boolean
		index: number
		color: string
	}) => void
	className?: string
}) {
	const solids = [
		'#E2E2E2',
		'#ff75c3',
		'#ffa647',
		'#ffe83f',
		'#9fff5b',
		'#70e2ff',
		'#cd93ff',
		'#09203f',
	]

	function onClose() {
		setColorPickerState({ ...colorPickerState, open: false })
	}

	return (
		<div className="bg-background w-72 rounded-lg border p-4 shadow-lg">
			<div className="mb-4 flex items-center justify-between">
				<h4 className="text-lg font-semibold">Choose or set a color</h4>
				<Button variant="ghost" size="icon" onClick={onClose}>
					<X className="h-4 w-4" />
					<span className="sr-only">Close</span>
				</Button>
			</div>
			<div className="mb-4 grid grid-cols-8 gap-2">
				{solids.map((color) => (
					<Button
						key={color}
						style={{ background: color }}
						className="h-6 w-6 cursor-pointer rounded-md p-0 transition-transform hover:scale-110"
						onClick={() => {
							handleColorChange(color, colorPickerState.index)
							setColorPickerState({ ...colorPickerState, color })
						}}
					/>
				))}
			</div>
			<div className="flex items-center gap-2">
				<div
					className="h-10 w-10 rounded-md border"
					style={{ background: colorPickerState.color }}
				/>
				<Input
					id="custom"
					value={colorPickerState.color}
					className="grow"
					onChange={(e) => {
						handleColorChange(e.target.value, colorPickerState.index)
						setColorPickerState({ ...colorPickerState, color: e.target.value })
					}}
				/>
			</div>
		</div>
	)
}
