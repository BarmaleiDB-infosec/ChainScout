ChainScout backend (prototype)

This folder contains a small Express prototype that demonstrates:

- A health endpoint
- A prototype `/api/analyze` endpoint that returns simulated analysis results
- A `/api/db-test` endpoint which attempts to connect to MSSQL using environment configuration

Getting started

1. Install dependencies

   npm install

2. Copy `.env.example` to `.env` and adjust values for your MSSQL instance.

3. Start server

   npm run start

Notes about MSSQL / SSMS and Windows Authentication

The screenshot you provided shows SSMS connecting to `localhost\\SQLEXPRESS` using Windows Authentication. From Node.js you have two main options:

1) Use SQL Server authentication (provide DB_USER and DB_PASSWORD) — works with the default `mssql` driver.
2) Use Windows authentication with the `msnodesqlv8` driver. That requires native driver installation and different connection options. If you need this, I can extend the server to support `msnodesqlv8` and add instructions.

Supabase

This prototype leaves Supabase for authentication on the front-end as requested.
