# Changelog

## Version 1.1.0 - November 12, 2026

### Added
- **Interactive Form Save Confirmation Prompt**:
  - In-page prompt rendered in an isolated Shadow DOM asking confirmation before storing details submitted on any visited career or application portal.
  - Prompts only once per site URL rather than prompting on every subsequent form submit.
- **Blocked / Silenced Sites Management**:
  - Declining to save a website now silences prompts for that domain by saving it to `blocked_sites`.
  - Added a dedicated "Blocked Sites" section in the **Saved Sites** tab showing all silenced domains with a one-click **Re-enable** button.
- **Dedicated Autofill Actions**:
  - Replaced ambiguous autofill buttons with explicit actions: **"Fill from Profile"** (general profile data) and **"Fill from Saved Site"** (custom captured portal questions).
- **Comprehensive Internationalization (i18n)**:
  - Full translations for all views, buttons, alerts, and tables across English (`en`), Hindi (`hi`), German (`de`), and French (`fr`).
- **Initial Default Profile**:
  - Pre-seeded default profile ("Default User" / `me@example.com`) assigned with a valid UUID v4 upon initial extension setup.

### Fixed & Optimized
- **Duplicate Profile Bug**: Prevented multiple automatic blank profiles from spawning upon form submissions.
- **Clean Site Deletion**: Removing a URL from Saved Sites now cleanly purges `saved_sites`, `sitesurls`, and resets content-script session decisions so the site can be re-prompted when revisited.
- **Resolved `[object Object]` in Profile Table**: Sanitized profile data rendering to exclude raw `sites` dictionaries and defensively formatted complex table cell values.
- **Bundle Size Optimization & Code Splitting**: Implemented Rollup `manualChunks` to split vendor dependencies (`vendor-react`, `vendor-icons`, `vendor-markdown`, `vendor-legendapp`), drastically reducing chunk sizes and eliminating build size warnings.
- **Manifest Syntax Fix**: Removed stray double comma from `src/manifest.json`.
- **UI Layout & Alignment**: Fixed element width discrepancies between the Performance Mode card and tab views.

---

## Version 1.0.0 - March 7, 2025

### Initial Release

- **Core Features**:
  - Save autofill data for common form fields (name, address, email, etc.).
  - Automatically fill out forms with saved autofill data.
  - Edit and manage saved autofill data within the extension.
  - Cross-browser support for both Chrome and Firefox.
  - Sync autofill data across devices when signed into the same account.
  - Device sync to ensure consistency of autofill data on all your devices.

- **User Interface**:
  - Simple and intuitive user interface for easy data management.
  - Autofill suggestions appear when filling out forms.
  - Settings page to manage sync options and edit saved data.

- **Bug Fixes**:
  - Initial stable release with no known major bugs.

---

Stay updated for upcoming features and improvements!