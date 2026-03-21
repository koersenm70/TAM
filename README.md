# Market Research & Lead Generation App

Automate market research, collect data from multiple sources, and manage leads — all in one place.

## Features

| Feature | Details |
|---|---|
| **Dashboard** | KPI cards, lead status/source charts, conversion rate |
| **Lead Management** | Full CRUD, search, filter, status tracking |
| **CSV/Excel Import** | Auto-detects column names, imports any spreadsheet |
| **LinkedIn Import** | Import your LinkedIn connections or Sales Navigator exports |
| **Web Scraper** | Extract emails, phones, company info from any website |
| **Bulk Scraping** | Queue multiple URLs at once |
| **Export** | Download filtered leads as CSV or Excel |

## Quick Start

```bash
chmod +x start.sh
./start.sh
```

Then open:
- **App**: http://localhost:5173
- **API Docs**: http://localhost:8000/docs

## Manual Setup

### Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Importing Data

### CSV / Excel
Any spreadsheet works. The importer auto-maps common column names:

| Your column | Maps to |
|---|---|
| Company, Organization, Account Name | company_name |
| Name, Full Name, Contact Name | contact_name |
| First Name + Last Name | contact_name (combined) |
| Email, Email Address | email |
| Phone, Mobile, Telephone | phone |
| Website, URL | website |
| Industry, Sector | industry |
| Company Size, Employees | company_size |
| Location, City, Country | location |
| LinkedIn, LinkedIn URL | linkedin_url |
| Notes, Comments | notes |

Any unrecognized columns are saved as **custom fields**.

### LinkedIn Export

1. Go to **LinkedIn Settings → Data Privacy → Get a copy of your data**
2. Select **Connections** and download the archive
3. Upload `Connections.csv` in the Import tab
4. For Sales Navigator: export lead lists directly as CSV

### Web Scraper

The scraper extracts:
- Email addresses (from mailto links and page text)
- Phone numbers
- Company name (from page title / OG tags)
- LinkedIn profile URL

Options:
- **Extract Emails / Phones / Company Name**: toggle extraction types
- **Follow Internal Links**: crawl the entire site (set max pages)
- **Bulk mode**: paste multiple URLs, one per line

> **Note**: Web scraping is subject to each site's Terms of Service. Use responsibly and respect `robots.txt`. Avoid scraping at high rates.

## Lead Statuses

| Status | Meaning |
|---|---|
| `new` | Just added |
| `contacted` | Outreach sent |
| `qualified` | Confirmed interest / fit |
| `converted` | Became a customer |
| `archived` | Not relevant |

## Tech Stack

- **Backend**: Python, FastAPI, SQLite, SQLAlchemy, pandas, BeautifulSoup
- **Frontend**: React 18, Vite, React Router

## Project Structure

```
TAM/
├── backend/
│   ├── main.py           # FastAPI app entry point
│   ├── database.py       # SQLite / SQLAlchemy setup
│   ├── models.py         # DB models + Pydantic schemas
│   ├── scraper.py        # Web scraping engine
│   ├── routers/
│   │   ├── leads.py      # CRUD for leads
│   │   ├── imports.py    # CSV/Excel/LinkedIn import
│   │   ├── scraping.py   # Scraping jobs
│   │   ├── export.py     # CSV/Excel export
│   │   └── analytics.py  # Dashboard stats
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── api.js        # API client
│   │   └── components/
│   │       ├── Dashboard.jsx
│   │       ├── LeadsTable.jsx
│   │       ├── ImportWizard.jsx
│   │       └── ScraperConfig.jsx
│   └── package.json
└── start.sh              # One-command startup
```
