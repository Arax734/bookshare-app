export function ThemeScript() {
  const themeScript = `
    (function() {
      try {
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.classList.toggle('dark', savedTheme === 'dark');
      } catch (e) {}
    })()
  `;

  return <script dangerouslySetInnerHTML={{ __html: themeScript }} />;
}
