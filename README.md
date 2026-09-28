# ResolveOps Incident Management

A lightweight incident management tool using GitHub Pages for the frontend, Google Apps Script for the API, and Google Sheets for storage.

## Backend

Google Sheet:
https://docs.google.com/spreadsheets/d/1RJJDGy-WZz54pmelyqR-pokV1oFluk6cu3E9Zaye77s/edit

The workbook contains:

- `Users` for application accounts and password hashes
- `Incidents` for incident records
- `Activity` for audit and incident history
- `Sessions` for authenticated sessions
- `Config` for application settings and incident numbering

Passwords are not stored in plaintext. The seeded Admin account uses a salted SHA-256 hash.

## Deploy the Apps Script backend

1. Open the Google Sheet.
2. Go to **Extensions → Apps Script**.
3. Replace the default Apps Script code with the contents of `Code.gs` from this repository.
4. In Project Settings, enable the manifest file if needed and use the contents of `appsscript.json`.
5. Click **Deploy → New deployment**.
6. Choose **Web app**.
7. Set **Execute as** to **Me**.
8. Set **Who has access** to **Anyone**.
9. Deploy and copy the Web App URL ending in `/exec`.
10. Open `config.js` in this repository and replace:
    `PASTE_YOUR_APPS_SCRIPT_WEB_APP_URL_HERE`
    with the deployed Web App URL.

The frontend will then authenticate against the `Users` sheet and read/write incidents directly through Apps Script.

## Frontend

The browser stores only the active session token in `sessionStorage`. Incident records are no longer stored in browser localStorage.

Supported backend actions:

- Login and logout
- Load incidents and activity
- Create incidents
- Update incident status
- Create audit/activity entries
- Expire sessions automatically

## Files

- `index.html` interface and login screen
- `styles.css` responsive UI
- `app.js` frontend application and API client
- `config.js` deployed Apps Script URL
- `Code.gs` Google Apps Script backend
- `appsscript.json` Apps Script manifest
