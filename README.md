# Mental Health Chat App

A secure, supportive platform for mental health conversations. Connect with others, access resources, and prioritize your wellbeing in a safe environment.

## Features

- **Secure Messaging**: Private one-on-one conversations
- **Crisis Detection**: Intelligent detection of crisis language with immediate resource suggestions
- **Mental Health Resources**: Access to crisis hotlines and mental health tips
- **User Authentication**: Secure login and registration with email verification

## Tech Stack

- **Frontend**: Next.js 14 with App Router, TypeScript, TailwindCSS
- **Backend**: Supabase (PostgreSQL, Authentication, Realtime)
- **State Management**: React Context API, React Query
- **Deployment**: Vercel (frontend), Supabase (backend)

## Getting Started

### Prerequisites

- Node.js 20.x or later
- npm or yarn
- Supabase account

### Environment Setup

1. Clone the repository
2. Create a `.env.local` file in the root directory with the following variables:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

3. Install dependencies:

```bash
npm install
# or
yarn install
```

### Database Setup

1. Create a new Supabase project
2. Run the SQL scripts in `src/db/schema.sql` in the Supabase SQL editor to set up the database schema

### Running the Development Server

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Project Structure

```
wellness-chat/
├── public/              # Static assets
├── src/
│   ├── app/             # Next.js App Router pages
│   │   ├── auth/        # Authentication pages
│   │   ├── dashboard/   # Dashboard and conversation pages
│   │   ├── resources/   # Mental health resources page
│   │   ├── layout.tsx   # Root layout
│   │   └── page.tsx     # Home page
│   ├── components/      # React components
│   │   ├── auth/        # Authentication components
│   │   └── providers/   # Context providers
│   ├── contexts/        # React contexts
│   ├── db/              # Database schema and migrations
│   └── utils/           # Utility functions
├── .env.local           # Environment variables (not in repo)
├── next.config.ts       # Next.js configuration
└── tsconfig.json        # TypeScript configuration
```

## Features in Detail

### Authentication

The app uses Supabase Authentication for user management:
- Email/password registration with email verification
- Secure login with JWT tokens
- Password reset functionality

### Messaging

- Real-time messaging using Supabase Realtime
- Message history with timestamps
- User online/offline status

### Crisis Detection

The app includes a simple crisis detection system that:
- Scans messages for crisis keywords
- Provides immediate resources when crisis language is detected
- Offers different levels of support based on detected risk level

### Mental Health Resources

- Directory of crisis hotlines and support services
- Mental health tips and best practices
- Accessible to both logged-in and anonymous users

## Deployment

### Frontend Deployment (Vercel)

1. Connect your GitHub repository to Vercel
2. Add the environment variables in the Vercel project settings
3. Deploy the project

### Backend Deployment (Supabase)

The backend is already deployed on Supabase when you create your project. Make sure to:
1. Set up appropriate Row Level Security policies
2. Configure authentication providers
3. Enable realtime functionality for the required tables

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements

- [Next.js](https://nextjs.org/)
- [Supabase](https://supabase.io/)
- [TailwindCSS](https://tailwindcss.com/)
- Mental health resources and crisis services
