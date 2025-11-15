# BeatCanvas

This repo contains a FastAPI backend and a Vite/React frontend.

## New: Authentication (Login / Register)

- Backend now exposes JWT-based authentication endpoints using MongoDB for user storage.
- Frontend includes new pages: `Login` and `Register`, and adds Login/Register/Logout controls to the header.

### Backend endpoints

Base prefix: `http://localhost:8000/api/v1`

- `POST /auth/register` — body: `{ "email": string, "password": string }` — returns `{ access_token, token_type, user }`
- `POST /auth/login` — body: `{ "email": string, "password": string }` — returns `{ access_token, token_type, user }`
- `GET /auth/me` — returns current user info (requires `Authorization: Bearer <token>`)

Existing endpoints remain unchanged (video/audio analysis, listing analyses).

### Environment

Create/Update `backend/.env` with:

```
MONGO_URI=mongodb://localhost:27017/
JWT_SECRET=change-me-to-a-long-random-string
```

### Install & Run

**Backend setup (WSL / Linux / macOS):**

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip setuptools wheel

# Install build dependencies first (required for madmom)
pip install Cython numpy==1.26.4

# Install remaining packages with --no-build-isolation for madmom
pip install --no-build-isolation -r requirements.txt

# Fix madmom Python 3.10+ compatibility
python patch_madmom.py

# Set JWT secret (or add to .env file)
export JWT_SECRET="$(openssl rand -hex 32)"

# Start server
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

**Backend setup (Windows cmd):**

```cmd
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install --upgrade pip setuptools wheel

rem Install build dependencies first (required for madmom)
pip install Cython numpy==1.26.4

rem Then install all requirements
pip install -r requirements.txt

rem Set JWT secret or add JWT_SECRET=... to .env file
set JWT_SECRET=changeme-long-random-string

uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

**Frontend:**

```cmd
cd frontend
npm install
npm run dev
```

**Troubleshooting:**
- If you see "externally-managed-environment" (PEP 668) on Debian/Ubuntu, always use a venv (see above).
- If `madmom` build fails with "No module named Cython", install Cython first (`pip install Cython numpy==1.26.4`), then use `pip install --no-build-isolation -r requirements.txt` to bypass pip's build isolation which prevents madmom from seeing your installed Cython.

### Frontend usage

- Visit `http://localhost:5173/login` to sign in, or `http://localhost:5173/register` to create an account.
- After login/register, you will be redirected to Dashboard.
- The token is stored in `localStorage` and automatically attached to API requests.

### Notes

- Passwords are hashed with bcrypt via `passlib`.
- JWTs are created with `python-jose`, algorithm HS256, default expiration 24h.
- You can adjust CORS/Origins in `backend/main.py` if needed.
