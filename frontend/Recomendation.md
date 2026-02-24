 Here’s what I found from package.json vs actual imports in src/ and
  index.html.

  Used in code

  - react, react-dom
  - react-router-dom
  - react-grid-layout
  - lucide-react
  - react-apexcharts (and apexcharts as its peer)

  Used only via CDN (not npm)

  - Bootstrap is loaded from CDN in index.html, not from npm. So bootstrap in
    dependencies is unused by the app.

  Very likely unused (no imports anywhere)

  - @emotion/cache, @emotion/react, @emotion/styled (only needed by MUI, which
    isn’t used)
  - @mui/material, @mui/icons-material, @mui/x-charts
  - react-chartjs-2, recharts
  - react-table
  - react-github-btn
  - prop-types
  - jwt-decode
  - chroma-js
  - yup
  - redis (should never be in frontend deps)
  - dotenv (Vite handles .env without this dependency)
  - stylis, stylis-plugin-rtl
  - react-scripts (CRA only; not used in Vite)

  ———

  ## Recommendations

  1) Remove unused deps now
  You’ll reduce bundle size and install time. Safe removals based on current
  usage:

  npm uninstall @emotion/cache @emotion/react @emotion/styled \
  @mui/material @mui/icons-material @mui/x-charts \
  react-chartjs-2 recharts react-table react-github-btn \
  prop-types jwt-decode chroma-js yup redis dotenv \
  stylis stylis-plugin-rtl react-scripts bootstrap

  If you plan to keep Bootstrap from npm instead of CDN, then don’t uninstall
  bootstrap, and import it in src/main.jsx.

  ———

  2) Pick one chart library
  You already use react-apexcharts. Unless you plan to adopt another:

  - Keep react-apexcharts + apexcharts.
  - Remove recharts and react-chartjs-2.

  If you want a “better” swap:

  - For simple React-friendly charts: recharts is fine and lightweight.
  - For lots of interactivity and options: apexcharts is strong.
  - Don’t keep multiple chart libs.

  ———

  3) UI library choice
  Right now you’re mixing Bootstrap (CDN) and no MUI usage. Choose one:

  - If you want MUI: add MUI components and keep @emotion/*, but remove
    Bootstrap CDN.
  - If you want Bootstrap: remove all MUI deps.

  ———

  4) Replace yup if you ever need validation
  If you add schema validation later, consider zod (better TS inference). But no
  need to add anything until you use it.

  ———

  If you want, I can:

  1. Clean package.json and package-lock.json for you.
  2. Switch Bootstrap from CDN to npm import (or vice versa).
  3. Normalize to one charting library and update components accordingly.