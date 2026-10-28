# SKSSF Amappoyil — member app (Expo)

React Native + Expo (SDK 58, Expo Router) with React Native Firebase.

- Login: Unit Member ID or SKSSF ID → confirm registered number (server only says "match") →
  Firebase phone OTP → `completeMemberLogin` sets the member claim.
- Tabs: News feed · Blood donors (group/compatible/location filters, eligibility, call/WhatsApp,
  offline cache) · Sahajari (equipment availability, approved patients, add-patient request) ·
  Committee (current + past) · Profile (my donor details, my requests, English/മലയാളം, log out).
- Push notifications (FCM) for new posts and request decisions.
- Inactive/blocked members are signed out and see "Access paused".

## Run

React Native Firebase needs a development build (not Expo Go):

```bash
npm install
npx expo run:android          # local build, or: npx eas-cli build --profile development
```

To use the local emulators copy `.env.example` to `.env.local` and set
`EXPO_PUBLIC_USE_EMULATORS=true` (`10.0.2.2` reaches the host from the Android emulator).

Checks: `npm run typecheck`, `npx expo-doctor`, `npm run bundle:check`.
