# The Ledger Room — Auction-Based E-Commerce Platform

A local, full-stack auction system.

- **Backend:** FastAPI + PostgreSQL (SQLAlchemy 2.0 async ORM via `asyncpg`), JWT auth
- **Frontend:** plain HTML, CSS, JavaScript (no build step, no framework)
- **Roles:** `admin` (auctioneer — creates products and schedules auctions) and `user` (bidder — places bids while an auction is live)

---

## 1. Prerequisites

- Python 3.10+
- PostgreSQL installed locally (no password needed — see step 2)
- Any static file server for the frontend (a one-line Python command is enough)

---

## 2. Database setup (no password, local trust auth)

Since you're running this locally only, the simplest setup is to let Postgres trust local
connections for your OS user, so no password is ever typed or stored.

```bash
# 1. Create the database (uses your OS username as the Postgres role, which
#    exists by default on most local Postgres installs)
createdb auction_house

# 2. Confirm you can connect without a password
psql auction_house -c "\conninfo"
```

If `createdb`/`psql` ask for a password, open `pg_hba.conf` (find it with
`psql -t -P format=unaligned -c 'show hba_file;'`) and set the `local` and
`127.0.0.1/32` lines to use `trust` instead of `md5`/`scram-sha-256`, then restart
Postgres:

```
# TYPE  DATABASE  USER  ADDRESS         METHOD
local   all       all                   trust
host    all       all   127.0.0.1/32    trust
```

The app never sends a Postgres password — `backend/.env` only needs a username, e.g.:

```
DATABASE_URL=postgresql+asyncpg://postgres@localhost:5432/auction_house
```

Tables are created automatically on first run — no migration step required for this project.

---

## 3. Backend setup

```bash
cd backend
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

pip install -r requirements.txt

cp .env.example .env
# edit .env if your Postgres username/db name differ from the defaults

uvicorn main:app --reload --port 8000
```

The API is now live at `http://localhost:8000` and interactive docs at
`http://localhost:8000/docs`.

### Creating the first admin (auctioneer) account

Registration is open, but creating an `admin` account requires the `ADMIN_SIGNUP_CODE`
set in `.env` (default: `admin secret code`). Change this value before you rely on it for
anything beyond local testing. Anyone registering without the code, or with the wrong
code, is created as a regular bidder.

---

## 4. Frontend setup

The frontend is static — serve it with any file server. From the `frontend/` folder:

```bash
cd frontend
python3 -m http.server 5500
```

Then open `http://localhost:5500` in your browser.

The frontend talks to the API at `http://localhost:8000` — if you run the backend on a
different port, update `API_BASE` at the top of `frontend/js/api.js`.

---

## 5. How it works

- **Admin (auctioneer):**
  1. Register/sign in with the admin signup code.
  2. On the *Auctioneer Desk* page, upload a product (name, description, image URL,
     starting price, minimum bid increment) and pre-declare the **opens** / **closes**
     date and time.
  3. The lot appears in the public catalog immediately, marked **upcoming** until its
     start time arrives.

- **Bidder (user):**
  1. Register/sign in as a bidder (no code needed).
  2. Browse the catalog — filter by *live*, *upcoming*, or *closed* lots.
  3. Open a lot; while it's **live**, submit a bid at or above the minimum shown.
     The backend rejects bids placed before the opening time, after the closing time,
     or below the current highest bid plus the minimum increment.
  4. When the countdown reaches zero, the lot closes automatically — the highest
     bidder is shown as the winner and the price becomes the hammer price. No
     background job is needed: status and winner are computed from the current time
     on every request.

---

## 6. Project structure

```
auction_house/
├── backend/
│   ├── main.py            # FastAPI app, CORS, table creation on startup
│   ├── config.py          # Settings loaded from .env
│   ├── database.py        # Async SQLAlchemy engine/session
│   ├── models.py          # User, Product, Auction, Bid ORM models
│   ├── schemas.py         # Pydantic request/response models
│   ├── security.py        # Password hashing + JWT
│   ├── deps.py             # get_current_user / require_admin dependencies
│   ├── routers/
│   │   ├── auth.py        # /auth/register, /auth/login, /auth/me
│   │   ├── auctions.py    # create/list/detail auctions (admin creates)
│   │   └── bids.py        # place a bid on a live auction
│   ├── requirements.txt
│   └── .env.example
└── frontend/
    ├── index.html          # Public catalog
    ├── login.html
    ├── register.html
    ├── admin.html          # Auctioneer desk: create lot, view own lots
    ├── auction.html        # Lot detail, live countdown, bidding
    ├── css/style.css
    └── js/
        ├── api.js          # fetch wrapper + auth/session helpers
        ├── auth.js
        ├── catalog.js
        ├── admin.js
        └── auction-detail.js
```
