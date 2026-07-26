# NCO Automation Studio

NCO Automation Studio is a React, Electron, and FastAPI application for preparing membership migration data. It supports source spreadsheet uploads, student-to-member mapping, migration configuration, and Account Metadata CSV generation.

## Technology

- React 19 and TypeScript
- Vite 8 and Tailwind CSS 4
- Zustand for application state
- SheetJS (`xlsx`) for spreadsheet parsing
- Electron for the desktop wrapper
- FastAPI for import generation

No database, authentication service, or `.env` file is required.

## Prerequisites

- [Node.js](https://nodejs.org/) 22.12.0 or newer
- npm, included with Node.js
- Python 3.10 or newer

```powershell
node --version
npm --version
python --version
```

## Installation

```powershell
Set-Location "C:\NCO automatic"
npm install
python -m pip install -r backend\requirements.txt
```

Replace the path if the project is stored elsewhere.

## Run in a browser

Start the frontend and backend together:

```powershell
npm run dev:full
```

Open the URL printed by Vite, normally `http://localhost:5173/`. Stop the server with `Ctrl+C`.

To run the processes separately:

```powershell
npm run dev:backend
npm run dev
```

## Run with Electron

In PowerShell:

```powershell
$backend = Start-Process powershell -PassThru -ArgumentList "-NoExit", "-Command", "npm run dev:backend"
$env:NODE_ENV = "development"
npm run dev:electron
```

Clear the environment variable afterward:

```powershell
Remove-Item Env:NODE_ENV
```

On macOS or Linux, run `NODE_ENV=development npm run dev:electron`.

## Application workflow

Step 1 requests:

1. KPI Sheet
2. UUID
3. Members
4. Membership + Plan Name
5. Membership Lookup
6. Class Booking
7. Future Membership (optional)

Only the KPI Sheet and Members spreadsheets are currently parsed. The other files are checked only for a non-empty file and a filename extension.

### KPI Sheet format

The first worksheet needs a student-name column. Supported headings include `Student Name`, `StudentName`, `student_name`, `Name`, and `Student`.

A phone column is optional. Supported headings include `Phone`, `Phone Number`, `Mobile`, `Contact Number`, and `Telephone`, including similar underscore or no-space forms.

### Members format

The first worksheet must use either separate `First Name` and `Last Name` columns or one `Name`/`Full Name` column. An `Email` column is required for a member row to be imported.

After all required files are accepted, select **Review Mapping**. Exact normalized names are matched automatically. Remaining students can be assigned manually or marked as not found.

The Configuration step collects the required Studio ID and migration dates. Generate Outputs uses the completed Review Mapping results and Studio ID to generate Account Metadata JSON through FastAPI, preview the first 50 rows, and download `account_metadata.csv`.

No example spreadsheets are currently included.

## Available commands

```powershell
npm run lint
npm run build
npm run preview
npm run dev:backend
npm run dev:full
```

There is currently no automated test suite or `npm test` script.

## Known limitations

- There is no Electron installer or packaging script.
- Uploaded files and parsed records do not survive a full page reload.
- The FastAPI backend must be running for import generation.
- XLSX generation and additional import generators are not implemented.

## Project structure

```text
src/
  components/       Wizard steps, import previews, layout, and shared UI
  services/         Excel parsing, mapping, and backend API calls
  store/            Zustand application state
Electron/
  main/             Electron main process
  preload/          Electron preload script
backend/
  app/              FastAPI routes, schemas, and import services
```
