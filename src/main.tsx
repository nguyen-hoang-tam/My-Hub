import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'

const globalStyles = `
  :root {
    --text: #4a4a55;
    --text-h: #16141c;
    --text-muted: #8a8794;
    --bg: #f6f5f2;
    --card-bg: #ffffff;
    --border: #e6e4df;
    --accent: #6c5ce7;
    --accent-hover: #5a4bd6;
    --accent-bg: rgba(108, 92, 231, 0.1);
    --danger: #e24c4c;
    --danger-bg: rgba(226, 76, 76, 0.1);
    --shadow: 0 1px 3px rgba(0, 0, 0, 0.06), 0 8px 24px rgba(0, 0, 0, 0.05);

    --sans: system-ui, 'Segoe UI', Roboto, sans-serif;

    font: 16px/1.5 var(--sans);
    letter-spacing: 0.15px;
    color-scheme: light;
    color: var(--text);
    background: var(--bg);
    font-synthesis: none;
    text-rendering: optimizeLegibility;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  :root[data-theme='dark'] {
    --text: #d6d6db;
    --text-h: #f2f2f5;
    --text-muted: #8a8794;
    --bg: #1f2831;
    --card-bg: #131b24;
    --border: #303030;
    color-scheme: dark;
  }

  * {
    box-sizing: border-box;
  }

  body {
    margin: 0;
  }

  h1,
  h2 {
    font-weight: 650;
    color: var(--text-h);
  }

  p {
    margin: 0;
  }
`

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <style>{globalStyles}</style>
    <App />
  </StrictMode>,
)
