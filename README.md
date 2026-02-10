# Defining Objective Recommender (Vercel + Cognito + Bedrock)

## What it does
- UI accepts agentic test JSON
- Server authenticates to Cognito using USER_PASSWORD_AUTH (+ SECRET_HASH)
- Server retrieves temporary AWS creds from Cognito Identity Pool
- Server invokes AWS Bedrock and returns JSON recommendation

## Setup
1. `npm i`
2. Copy `.env.example` to `.env.local` and fill values
3. `npm run dev`

## Deploy to Vercel
- Push to GitHub
- Import into Vercel
- Add env vars from `.env.local` into Vercel Environment Variables (Production + Preview + Development)
- Deploy

## AWS requirements
- Cognito User Pool App Client must allow USER_PASSWORD_AUTH
- Identity Pool must allow authenticated identities for the User Pool provider
- Identity Pool Auth Role must allow bedrock:InvokeModel for your chosen model
