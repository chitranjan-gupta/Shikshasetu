# Shikshasetu: Autofill & Clipper

The **Shikshasetu: Autofill & Clipper Web Extension** is a powerful and easy-to-use tool for managing your form autofill data across multiple browsers and devices. With this extension, you can save, edit, fill, and sync your autofill information seamlessly in both Chrome and Firefox browsers.

---

## Features

- **Save Autofill Data**: Automatically save form data like addresses, emails, payment details, and more.
- **Edit Autofill Entries**: Easily manage and update saved form data directly within the extension.
- **Fill Forms Automatically**: Autofill forms with your saved data across websites and online services.
- **Cross-Browser Sync**: Sync your autofill data between Chrome and Firefox browsers across all your devices.
- **Device Sync**: Sync autofill information between devices to keep your data consistent everywhere.

---

## Developer Setup & Local Development

### Prerequisites

- **Node.js**: v18.0.0 or higher
- **npm** (or yarn / pnpm)
- **Google Chrome** / Chromium and/or **Mozilla Firefox**

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/your-username/shikshasetu.git
cd shikshasetu
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

Set the required environment variables:

| Variable | Required | Description | Example |
| :--- | :--- | :--- | :--- |
| `VITE_API_URL` | **Yes** | Base URL of the ShikshaSetu backend API | `http://localhost:8000` |
| `VITE_TEMP_MAIL_API_URL` | No | Base URL for disposable temporary mail service | `https://api.tempmail.example.com` |
| `VITE_FIELD_MATCHERS_URL` | No | Remote CDN URL for dynamically updating autofill field-matcher rules | `https://cdn.example.com/field-matchers.json` |

> [!IMPORTANT]
> If `VITE_API_URL` is omitted or empty, all API operations (including sign-in, signup, and OAuth callbacks) will target `undefined/...`, causing network and XML parsing errors.

### 3. Build & Run Extension

#### Development Mode with Live Runner (`web-ext`)

- **Firefox**:
  ```bash
  npm run dev:firefox
  ```
  *(Builds Firefox bundle and launches temporary profile in Firefox Desktop)*

- **Chrome / Chromium**:
  ```bash
  npm run dev:chrome
  ```
  *(Builds Chrome bundle and launches Chromium)*

- **Web Preview / Dev Server** (Standalone Vite UI dev server):
  ```bash
  npm run dev
  ```

#### Production Builds

- Build for Firefox:
  ```bash
  npm run build:firefox
  ```
- Build for Chrome:
  ```bash
  npm run build:chrome
  ```

The generated extension bundle will be output to the `build/` directory.

### 4. Load Unpacked Extension Manually

#### Chrome / Chromium / Edge / Brave:
1. Navigate to `chrome://extensions/`.
2. Toggle on **Developer mode** in the top-right corner.
3. Click **Load unpacked**.
4. Select the `build/` directory inside this project repository.

#### Firefox:
1. Navigate to `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on...**.
3. Select `build/manifest.json`.

---

## Testing & Quality

```bash
# Run unit tests (Vitest)
npm run test

# Run tests in watch mode
npm run test:watch

# Lint codebase
npm run lint

# Format code with Prettier
npm run format
```

---

## Installation (Production Release)

### Chrome Desktop and Kiwi Browser

#### Method 1

1. Open the [Chrome Web Store](https://chrome.google.com/webstore) in your browser.
2. Search for **Shikshasetu: Autofill & Clipper**.
3. Click **Add to Chrome**.
4. Confirm the installation by clicking **Add Extension**.
5. Once installed, the extension icon will appear in your browser’s toolbar.

#### Method 2

1. Download the chrome extension zip file from releases section.
2. Extract the zip file
3. Open Chrome Browser and navigate to `chrome://extensions`
4. Enable the developer mode
5. Click on Load Unpacked
6. Choose the extracted extension zip file

### Firefox Desktop and Firefox Mobile

1. Open the [Firefox Add-ons](https://addons.mozilla.org) page.
2. Search for **Shikshasetu: Autofill & Clipper**.
3. Click **Add to Firefox**.
4. Follow the prompts to install the extension.
5. Once installed, the extension icon will appear in your browser’s toolbar.

---

## Setup & Usage

### Sync Across Devices

1. **Sign In**: After installation, sign in with your account (create a new one if necessary).
2. **Enable Sync**: Go to the extension settings and enable sync. This will allow your autofill data to be synced across all your devices and browsers.
3. **Sync Autofill Data**: Your saved autofill data will automatically sync and be available across all devices where the extension is installed.

### Saving Autofill Data

1. **Save New Data**: When you fill out a form, the extension will prompt you to save the information for future use.
2. **Edit Saved Data**: To edit or update saved entries, click the extension icon, navigate to **Saved Data**, and make the necessary changes.

### Autofill Forms

1. **Fill Forms**: When visiting a website with saved form fields, the extension will automatically suggest autofilling the fields. You can choose to autofill or fill them manually.
2. **Custom Autofill Settings**: Customize the fields to be filled by accessing the extension settings. You can choose to autofill specific fields like names, emails, addresses, etc.

### Field matching rules

The extension decides which profile value goes into an input from `src/field-matchers.json`. That file ships with the extension. To change the rules later without changing the source code, host an updated copy of the file and point the extension at it.

1. Set this in the environment before building the extension:

```bash
VITE_FIELD_MATCHERS_URL=https://your-cdn.example.com/field-matchers.json
```

2. Build and install that version once.
3. Publish rule changes by replacing the JSON file at that URL.

The extension downloads the file when it is installed and each time the browser starts. The downloaded rules are used on the next fill. If the URL is missing, the download fails, or the JSON is invalid, the bundled `src/field-matchers.json` is used instead.

Each rule names the input attribute to match and the profile value to write:

```json
{ "by": "name", "keys": ["postal", "zip"], "path": "zip_code" }
```

- `by` is `name`, `type`, `id`, or `autocomplete`.
- `keys` are the attribute values to match. Matching ignores letter case and surrounding spaces.
- `path` is the profile field to write, including nested fields such as `phone_number.phone_number` or `salary_expectation.salary`.
- A gender radio uses `gender` instead of `path`: `{ "by": "id", "keys": ["female"], "gender": "female" }`.

The first match wins, in this order: `name`, then `type`, then `id`, then `autocomplete`.

---

## Troubleshooting

- **Sync Issues**: If sync is not working, ensure you're signed into the same account across all devices. Check your internet connection and ensure the sync option is enabled in the settings.
- **Form Not Autofilling**: If autofill is not working as expected, check that the form fields match the saved data. Manually editing the saved data may help resolve any issues.
- **Blank Option / Login Page**: Ensure the extension option URL opens with a hash router (e.g. `src/option/index.html#/login`). If `loc="/option"` was forced, it would redirect to `/option` and clear the intended hash route.
- **`undefined/user/...` Network Errors**: You are missing `VITE_API_URL` in `.env`. Copy `.env.example` to `.env` and set your backend API URL before compiling.

---

## License

Shikshasetu: Autofill & Clipper Web Extension is licensed under the [MIT License](LICENSE).

---
