# igraph-it Capstone Project

This project has two parts:

* Backend → `igraph-backend`
* Frontend → `igraph-frontend`


# IMPORTANT: MISSING FILES (READ FIRST)

Some files are NOT included in the repository.

```
igraph-backend/node_modules
igraph-backend/.env
igraph-backend/serviceAccountKey.json
igraph-frontend/node_modules
igraph-frontend/.expo
```

You must set these up manually.

# REQUIREMENTS

Install:

* Node.js (LTS)
* npm (comes with Node)

Install Expo CLI:

```
npm install -g expo-cli
```

---

# CLONE THE PROJECT

```
git clone https://github.com/ceejaydev1/igraph-it.git
cd igraph-it
```

---

# BACKEND SETUP (`igraph-backend`)

## 1. Go to backend

```
cd igraph-backend
```

## 2. Install dependencies

```
npm install
```

## 3. Create `.env`

Create a file named `.env` inside `igraph-backend`

## 4. Paste this template

```
PORT=5000
NODE_ENV=development

FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=

JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

EMAIL_USER=
EMAIL_PASS=

FRONTEND_URL=http://localhost:8081
APP_NAME=iGraph IT
```

## 5. Get values

Chat ka sa gc kung ano ilalagay na value dun sa .env

## 6. Add Firebase key

Get:

```
serviceAccountKey.json
```

Place it in:

```
igraph-backend/serviceAccountKey.json
```

## 7. Run backend

```
npm start
```

---

# FRONTEND SETUP (`igraph-frontend`)

## 1. Go to frontend

```
cd ../igraph-frontend
```

## 2. Install dependencies

```
npm install
```

## 3. Run frontend

```
npx expo start
```

---

# COMMON ERRORS

## Cannot find module

```
npm install
```

## Firebase error

* Check `.env`
* Check `serviceAccountKey.json`

## Port already in use

Change:

```
PORT=5001
```

## Expo not loading

```
npx expo start --clear
```

---

# SECURITY

Do NOT upload:

* `.env`
* `serviceAccountKey.json`

Share secrets privately only.

---

# CHECKLIST

* Installed Node.js
* Ran npm install
* Created `.env`
* Got `.env` values
* Added serviceAccountKey.json
* Backend running
* Frontend running

---

# DONE

If setup is correct, backend and frontend should run.
