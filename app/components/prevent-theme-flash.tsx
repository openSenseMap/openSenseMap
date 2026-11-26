import { type ThemePreference } from '~/lib/theme'

export function PreventFlashOnWrongTheme({
	themePreference,
}: {
	themePreference: ThemePreference
}) {
	const script = `
  /*
    The server can read the saved theme preference from the cookie/database,
    but it cannot know the browser's current "prefers-color-scheme" value.

    This matters when the saved preference is "system":
    - "light" and "dark" are explicit and can be rendered correctly by the server.
    - "system" must be resolved in the browser because it depends on
      window.matchMedia('(prefers-color-scheme: dark)').

    Running this small script in the document head lets us update the <html>
    class before the CSS is painted, preventing a flash of the wrong
    theme during initial page load.
  */
(() => {
  const preference = ${JSON.stringify(themePreference)};
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme = preference === 'dark' || (preference === 'system' && prefersDark)
    ? 'dark'
    : 'light';

  const root = document.documentElement;
  root.classList.remove('light', 'dark');
  root.classList.add(theme);
  root.style.colorScheme = theme;
})();
`

	return <script dangerouslySetInnerHTML={{ __html: script }} />
}
