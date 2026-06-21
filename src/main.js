import './styles/app.css';
import App from './App.svelte';
import faviconUrl from './assets/cs-util-logo.ico';

// Inject favicon link. Because Vite inlines small assets (assetsInlineLimit
// is huge in our config), `faviconUrl` becomes a data: URL so the favicon
// also works when the dist/index.html is opened directly via file://
const link = document.createElement('link');
link.rel = 'icon';
link.type = 'image/x-icon';
link.href = faviconUrl;
document.head.appendChild(link);

const app = new App({
  target: document.getElementById('app')
});

export default app;
