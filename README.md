# FitTrack AI

## Google sign-in setup

This app uses Google Identity Services for real Google account sign-in.

1. Create an OAuth 2.0 Client ID in Google Cloud Console.
2. Choose **Web application** as the application type.
3. Add your dev origin, for example `http://localhost:5173`, under Authorized JavaScript origins.
4. Copy `.env.example` to `.env` and set `VITE_GOOGLE_CLIENT_ID` to your Client ID.
5. Restart the Vite dev server after changing `.env`.

Email/password accounts are still stored locally in the browser for this demo app.
