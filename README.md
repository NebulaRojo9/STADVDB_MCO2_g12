# Distributed Database Management System (DDBMS)

This repository contains a complete DDBMS simulation with three main components:

- **Backend** – Node.js/Express servers simulating distributed nodes

- **Frontend** – Vite + React UI for interacting with the DDBMS

- **SQLTest** – Python scripts used for importing data, running isolation-level tests, and preparing row data

Each directory has its own environment variables (.env) and dependency installation steps. A central deployment script (deploy.sh) in the root simplifies startup.

## Project Structure

```bash
root
├── backend/    # Node.js backend services
├── frontend/   # Vite + React frontend web app
└── sqltest/    # Python scripts for testing, imports, isolation levels
```

Each folder contains:
- Its own .env
- Its own setup commands
- Optional .bat and .sh helper scripts
- (Only the deploy.sh in the root is essential.)

## Prerequisites

- Linux VM or WSL
- Bash shell
- Git
- Python version 3.x (LTS)
- Node version 22.x (LTS)
- Npm version 11.x (LTS)

## Project Setup

### `./backend`

1. Setup environment variables according to `.env.example`
2. Install necessary node packages. If there are any remaining uninstalled packages when running the backend, kindly install them as well.
```bash
npm i
```
3. Proceed to `./frontend` setup

### `./frontend`

1. Setup environment variables according to `.env.example`
2. Install necessary node packages. If there are any remaining uninstalled packages when building the frontend, kindly install them as well.
```bash
npm i
```
3. Build the vite project
```bash
npm run build
```
4. Copy the resulting `dist/` folder to the `./backend` repository

### `./sqltest`

1. Setup environment variables according to `.env.example`
2. Install necessary python packages. If there are any remaining uninstalled packages when running the scripts, kindly install them as well.
```bash
pip install -r requirements.txt
```
3. Run each python script individually
- `import.py` - imports the IMDB dataset tsv file `title.basics.tsv` to the specified db nodes in `.env`
- `setup_test_row.py` - adds the required test row for running concurrency tests in the frontend to the specified db in `.env`
- `isolation_test.py` - uses nodes A and B to test concurrency using different isolation levels


## Running the project

1. Go to the `./backend` folder, and run 
```bash
npm run dev
```
Or alternatively, in linux, run the following in the root directory:
```bash
chmod +x deploy.sh
./deploy.sh
cd ./backend
npm run dev
```

## AI Use Declaration
- Generative AI such as Gemini, ChatGPT, and Copilot were used to assist the programmers in creating the repository.
