# NCO Automation Studio

NCO Automation Studio is a React, Electron, and FastAPI application for preparing membership migration data. It supports source spreadsheet uploads, student-to-member mapping, migration configuration, and CSV generation for Account Metadata, Membership Cancellation, Membership, and Recurring Bookings imports.

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

```bash
node --version
npm --version
python --version
```

## Installation

From the project root:

```bash
npm install
python -m pip install -r backend/requirements.txt
```

On Windows PowerShell, use `backend\requirements.txt` if needed.

## Run in a browser

Start the frontend and backend together:

```bash
npm run dev:full
```

Open the URL printed by Vite, normally `http://localhost:5173/`. Stop the server with `Ctrl+C`.

To run the processes separately:

```bash
npm run dev:backend
npm run dev
```

## Run with Electron

Start the FastAPI backend in one terminal:

```bash
npm run dev:backend
```

In another terminal:

```bash
NODE_ENV=development npm run dev:electron
```

On Windows PowerShell:

```powershell
$backend = Start-Process powershell -PassThru -ArgumentList "-NoExit", "-Command", "npm run dev:backend"
$env:NODE_ENV = "development"
npm run dev:electron
Remove-Item Env:NODE_ENV
```

## Application workflow

### Step 1 — Upload files

Required uploads:

1. KPI Sheet
2. UUID
3. Membership + Plan Name
4. Class Booking

All four files are parsed from their first worksheet. Header matching supports common Glofox export names and simplified alternatives.

#### KPI Sheet format

The first worksheet needs a student-name column. Supported headings include `Student Name`, `StudentName`, `student_name`, `Name`, and `Student`.

A phone column is optional. Supported headings include `Phone`, `Phone Number`, `Mobile`, `Contact Number`, and `Telephone`, including similar underscore or no-space forms.

The configuration screen reads the available KPI headers, automatically selects the closest Deferral Date and Membership Price columns, and provides dropdowns for choosing different columns when required.

#### UUID format

The UUID worksheet must include email and user ID columns. Supported user ID headings include `User ID`, `Dimension - User ID`, `UUID`, `User UUID`, `Glofox User ID`, `Member ID`, and `Customer ID`.

#### Class Booking format

The Class Booking worksheet must include user ID, program ID, and schedule code columns. Glofox headings such as `Dimension - User Id`, `Flt Booking Events Program ID`, and `Flt Booking Events Schedule Code` are supported.

#### Membership + Plan Name format

The first worksheet must include an email column for a row to be imported. Supported headings include `Dimension - User Email` and `email`.

Name is read from headings such as `Full Name`, `Dimension - User Full Name`, `User Full Name`, or `Name`. Additional fields used by import generators include user ID, membership name, plan name, payment method, price, purchased date, and commenced date when those columns are present.

### Step 2 — Review Mapping

After all required files are accepted, select **Review Mapping**. Exact normalized student names are matched automatically against Membership + Plan Name records. Remaining students can be assigned manually or marked as not found. Indexed matching, on-demand suggestions, and virtualized table rows keep large review sets responsive.

### Step 3 — Configuration

Collects migration settings used by the generators, including:

- Studio ID
- Cycle Start Date and Next Payment Date (`DD-MM-YYYY`)
- Deferral Date and Deferral Membership Price KPI headers, selected from detected KPI columns
- Book Start Date and Book Until Date

### Step 4 — Generate Outputs

Uses the completed Review Mapping results, Membership + Plan Name lookup, KPI records, and configuration to generate import CSVs through FastAPI:

| Import | Output file | Notes |
| --- | --- | --- |
| Account Metadata | `account_metadata.csv` | Requires Studio ID and matched students |
| Membership Cancellation | `membership_cancellation.csv` | Requires Membership + Plan Name lookup and matched students |
| Membership | `membership.csv` | Requires Studio ID, cycle/next payment dates, and Membership + Plan Name lookup; reports skipped rows |
| Recurring Bookings | `recurring_bookings.csv` | Resolves matched emails through UUID and Class Booking data; excludes students with a membership deferral date |

#### Membership Next Payment Date logic

- `ACTIVE` memberships always use the Next Payment Date entered in Configuration. Any source Next Payment Date is ignored.
- Source memberships with `FUTURE` status use their source Next Payment Date and are skipped when that date is missing.
- Memberships with a KPI Deferral Date use the Deferral Date as their Next Payment Date and are generated with `FUTURE` status.
- The output value is formatted as `YYYY-MM-DDT10:29:30`.

Each generator supports preview of the first 50 rows and CSV download.

Before generating Membership Cancellation, Membership, or Recurring Bookings, confirm that EA agreements are disabled. Account Metadata can be generated without this confirmation.

No example spreadsheets are currently included.

## Available commands

```bash
npm run lint
npm run build
npm run preview
npm run dev:backend
npm run dev:full
```

Run backend unit tests from the `backend` directory:

```bash
python -m unittest discover -s tests
```

There is currently no frontend test suite or `npm test` script.

## Known limitations

- There is no Electron installer or packaging script.
- Uploaded files and parsed records do not survive a full page reload (only theme preference is persisted).
- The FastAPI backend must be running for import generation.
- XLSX export is not implemented; generated outputs are CSV only.
- Only the first worksheet in each uploaded spreadsheet is processed.

## Project structure

```text
src/
  components/       Wizard steps, import previews, layout, and shared UI
  services/         Excel parsing, mapping, and backend API calls
  store/            Zustand application state
  types/            Shared import request and response types
Electron/
  main/             Electron main process
  preload/          Electron preload script
backend/
  app/              FastAPI routes, schemas, and import services
  tests/            Backend unit tests
```
