# Separate test services for PHOTOlab Desktop

The Windows preview currently blocks accounts, billing, and cloud photo uploads. This guide prepares the next stage. Creating these services does **not** automatically enable them in the current build; the desktop authentication and backend integration still need implementation and testing.

Your live website remains `https://ez-photolab.vercel.app/`. Keep its deployment, Firebase project, Stripe live configuration, and live secrets unchanged throughout this setup.

## 1. Create a separate Firebase test project

In the Firebase console, create a new project for desktop testing—for example, `PHOTOlab Desktop Test` with an available project ID. Register a Web app inside this **new project**, rather than adding another app to the existing production project. Apps in one Firebase project share underlying resources. Firebase recommends distinct projects for separate environments. [Firebase environment guidance](https://firebase.google.com/docs/projects/dev-workflows/general-best-practices)

Enable the sign-in providers needed for testing and create a test Firestore database with restrictive rules. Use dedicated test accounts and fabricated profile data. Once a staging web address exists, add only that address to the test project's authorized domains.

Keep the new Web app's public Firebase configuration for the developer. Firebase Admin credentials belong only in the staging backend's secret settings. Do not embed them in the desktop application or commit them.

Before enabling desktop sign-in, commit and test Firestore rules that let a user read their own account and edit permitted profile fields while denying client writes to paid tier, subscription identifiers, billing status, or license expiry. Those fields must be updated by the backend. Test allowed and denied cases with the Firebase emulators. [Firebase rules guidance](https://firebase.google.com/docs/rules/basics)

## 2. Create a Stripe sandbox

Use the account picker in the Stripe Dashboard to create/open a separate sandbox for PHOTOlab desktop testing. Create sandbox products and prices for the plans you want to offer: Pro and Team, with monthly/annual prices if both billing periods are supported. Record the price IDs and which plan/period each represents. Use sandbox keys and Stripe's test payment methods. [Stripe sandboxes](https://docs.stripe.com/sandboxes), [Stripe testing](https://docs.stripe.com/testing)

After the staging backend has been secured and deployed, create a sandbox webhook endpoint pointing to its `/api/stripe-webhook` route. Configure the events the implemented handler requires. Store the webhook signing secret in that backend. Webhook events must be signature-verified and processed idempotently. A successful checkout redirect alone must not grant paid access. [Stripe webhook setup](https://docs.stripe.com/webhooks)

Do not point a sandbox webhook at the current live site. Do not reuse live keys or live price IDs.

## 3. Prepare a separate staging backend

Create a separate hosting project for the test backend when its implementation is ready for review. If using Vercel, give it a different project name and URL from the existing site. Do not attach desktop development to the live project's production deployment workflow. Deployment is a separate step requiring your approval; none has been performed by this task.

The repository's existing API files reference these server-side settings:

| Setting | Test value/location |
| --- | --- |
| `FIREBASE_PROJECT_ID` | New test Firebase project ID |
| `FIREBASE_CLIENT_EMAIL` | Test Firebase Admin service-account email |
| `FIREBASE_PRIVATE_KEY` | Test Admin private key, in server secret storage |
| `STRIPE_SECRET_KEY` | Stripe sandbox secret key, in server secret storage |
| `STRIPE_WEBHOOK_SECRET` | Signing secret for the staging webhook |
| `STRIPE_PRICE_PRO` / `STRIPE_PRICE_TEAM` | Sandbox prices; current code has only these two slots |
| `NEXT_PUBLIC_APP_URL` | Staging web URL; current checkout code otherwise falls back to the live site |

This table describes existing variable names, **not a deploy-ready backend**. Required code changes before it can be used:

- Verify a Firebase ID token and derive the user identity on the server; do not trust a submitted user ID.
- Map a plan and billing period to known sandbox price IDs. Add an explicit four-price map if offering monthly and annual Pro/Team plans. Reject unknown prices rather than granting Pro by default.
- Restrict checkout/portal return URLs to configured staging pages. Remove the production URL fallback from the staging implementation.
- Replace simulated checkout, account management, admin overrides, and client-side entitlement changes with real server-controlled flows.
- Handle subscription cancellation, payment failure, renewals, delayed events, and duplicate webhook delivery.

## 4. Keep cloud AI keys on the backend

Prepare a separate provider test workspace/key where the provider supports it. Initially use mock AI responses to test the desktop flow without sending photographs. A provider may charge for real test calls even when Firebase and Stripe are in test environments; confirm the provider's test arrangements before enabling them.

The desktop should send an authenticated request to your test backend. The backend should authorize the operation, apply quotas, and call the AI provider using its server-held key. The desktop should explain when a photo will be uploaded. The old API-key input fields remain hidden in the Windows preview.

## 5. Implement the desktop connection

Use the system browser for sign-in and hosted checkout. Implement a validated return flow with one-use authorization codes, state/PKCE where applicable, and appropriate token storage. A different desktop authentication return protocol is needed; the internal `photolab://app/` asset scheme is not an authentication endpoint.

Add an explicit staging build configuration for the approved backend and test Firebase project. Keep it separate from both the current local-only preview and the future production desktop build. Update the native request allowlist only for the required test services. Never distribute server credentials in `VITE_*` variables or in the Electron bundle.

These are implementation requirements for the next stage, not switches already available in this preview. See [Electron security guidance](https://www.electronjs.org/docs/latest/tutorial/security).

## 6. What to provide for the next development stage

- The new Firebase test project's **public Web app configuration**.
- The staging backend URL once an approved deployment exists.
- Sandbox price IDs and their plan/billing-period mapping.
- Confirmation that server secrets have been entered in the staging host's secret settings; keep the secret values out of chat and Git.
- The cloud AI provider/workspace selected for testing, or a decision to keep mocked responses initially.

Acceptance checks should cover sign-in/sign-out, expired sessions, free and paid access, payment success/failure/cancellation, repeated webhook delivery, interrupted cloud jobs, and denial of attempts to change tiers from the desktop. Verify that every test record appears in the test projects and no request reaches the live website or production data.

Once those checks pass, prepare a signed release candidate and a separate production connection plan for approval. The Windows application can then use the same real accounts and cloud services as the website while remaining a separate installation and release channel.
