# Playwright Gym

Practice site plus Playwright automation. Portfolio repo for locators, frames, shadow DOM, files, and network.

```
Playwright-Gym/
├── website/          # app (http://127.0.0.1:4173)
└── automation/       # Playwright Test + TypeScript
```

## Run the site

```bash
cd website
npm start
```

Open http://127.0.0.1:4173

## Run tests

```bash
cd automation
npm install
npx playwright install chromium
npx playwright test --project=chromium
```

Playwright starts `../website` itself unless port 4173 is already in use.

Useful scripts:

```bash
npm test                 # all projects
npm run test:smoke       # tests tagged @smoke
npm run test:ui          # Playwright UI mode
npm run report           # last HTML report
```

Use **`automation/playwright.config.ts`**. Do not use a config inside `website/`.
