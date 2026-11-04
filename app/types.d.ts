/**
 * Type declarations for the entire project.
 **/
declare module '@sensebox/sketch-templater' {
	const SketchTemplater: new (cfg: unknown) => {
		generateSketch: (box: unknown, options?: { encoding?: string }) => string
	}
	export default SketchTemplater
}
