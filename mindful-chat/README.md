# MindfulChat - Mental Health Chat Application

MindfulChat is a real-time chat application designed specifically for mental health support, connecting patients with mental health professionals in a secure, user-friendly environment.

## Overview

MindfulChat facilitates communication between patients and mental health professionals through:
- Private 1:1 sessions
- Group support rooms
- Crisis detection with immediate resource connections
- Real-time message delivery and read status tracking
- Message reactions & Emoji support
- User presence indicators

## Tech Stack

### Frontend
- **Next.js 15.x** - React framework with App Router
- **React 19** - UI library
- **TailwindCSS** - Utility-first CSS framework
- **ShadCN UI** - Component library based on Radix UI
- **next-themes** - Theme management (light/dark mode)
- **Lucide React** - Icon library
- **emoji-picker-react** - Emoji selector component

### Backend
- **Supabase** - Backend-as-a-Service platform providing:
  - Authentication (OAuth and email/password)
  - PostgreSQL database
  - Row-Level Security (RLS) policies
  - Database functions and triggers
  - Realtime messaging with Pub/Sub
  - Storage for user avatars

## Features

### Authentication & User Management
- **Multiple Auth Methods** - Email/password and OAuth providers
- **User Profiles** - Customizable with avatar, name, and role settings
- **Role-Based Access** - Different views and capabilities for patients and mental health professionals

### Chat System
- **Real-time Messaging** - Instant message delivery with Supabase Realtime
- **Message Status Tracking** - Delivered and read indicators for messages
- **User Presence** - See who's currently online in chat rooms
- **Emoji Reactions** - React to messages with emoji
- **1:1 and Group Sessions** - Support for both individual therapy and group support

### Mental Health Features
- **Session Approval Workflow** - Mental health professionals can approve patient connection requests
- **Crisis Detection System** - Automatically identifies potentially concerning messages
- **Crisis Resources** - Provides immediate access to crisis hotlines and support resources
- **Standardized Naming Convention** - Sessions display as "Patient Name <-> Professional Name"

### UI/UX
- **Responsive Design** - Mobile-first approach for all device sizes
- **Dark/Light Themes** - User-selectable appearance
- **Accessibility** - Keyboard navigation and screen reader support
- **Toast Notifications** - Non-intrusive alerts for system events

## Database Schema

### Database Diagram

```
+-------------------+       +-------------------+       +-------------------+
|    profiles       |       |      rooms        |       | room_participants |
+-------------------+       +-------------------+       +-------------------+
| id (PK)           |       | id (PK)           |       | id (PK)           |
| username          |       | name              |       | room_id (FK)      |
| first_name        |       | description       |       | profile_id (FK)   |
| last_name         |       | is_private        |       | created_at        |
| avatar_url        | <--+  | created_by (FK)   |       | updated_at        |
| role              |    |  | room_type         | <--+  | metadata          |
| is_verified       |    |  | patient_id (FK)   |    |  +-------------------+
| created_at        |    |  | doctor_id (FK)    |    |
| updated_at        |    |  | status            |    |
+-------------------+    |  | metadata          |    |
        ^                |  | created_at        |    |  +-------------------+
        |                |  | updated_at        |    |  |     messages      |
        |                |  +-------------------+    |  +-------------------+
        |                |          ^                |  | id (PK)           |
        |                |          |                |  | room_id (FK)      |
        |                +----------+                +--| profile_id (FK)   |
        |                                               | content           |
        |      +-------------------+                    | created_at        |
        |      |  message_reactions|                    | updated_at        |
        |      +-------------------+                    | delivered_at      |
        +------| profile_id (FK)   |                    | read_at           |
               | message_id (FK)   | <------------------| recipient_id (FK) |
               | reaction_type     |                    +-------------------+
               | created_at        |                             ^
               +-------------------+                             |
                                                                 |
                                               +-------------------+
                                               |   notifications   |
                                               +-------------------+
                                               | id (PK)           |
                                               | profile_id (FK)   |
                                               | type              |
                                               | content           |
                                               | read_at           |
                                               | created_at        |
                                               | metadata          |
                                               +-------------------+
```

### Tables
- **profiles** - Extended user profiles with roles (professional/patient)
- **rooms** - Chat rooms including 1:1 sessions and group chats
- **room_participants** - Tracks room membership and permissions
- **messages** - Stores chat messages with delivery/read status
- **message_reactions** - Emoji reactions for messages
- **notifications** - System notifications for new messages, requests, etc.

### Database Functions
- **mark_message_as_delivered** - Updates message delivery status
- **mark_message_as_read** - Updates message read status
- **create_message_request** - Creates a pending session request
- **handle_message_request** - Approves or declines session requests
- **handle_message_request_notification** - Creates notifications for requests
- **handle_new_message_notification** - Notifies participants of new messages

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Supabase account

### Installation

1. Clone the repository
```bash
git clone https://github.com/your-username/mindfulchat.git
cd mindfulchat
```

2. Install dependencies
```bash
npm install
# or
yarn install
```

3. Set up environment variables
Create a `.env.local` file with the following variables:
```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

4. Run the development server
```bash
npm run dev
# or
yarn dev
```

5. Open [http://localhost:3000](http://localhost:3000) to view the application

## Deployment

The application can be deployed on any platform that supports Next.js:

- **Vercel**: Recommended for easiest deployment
- **Netlify**: Good alternative with similar capabilities
- **Self-hosted**: Can be built and served from any Node.js server

## Usage

### For Patients
1. Create an account and complete your profile
2. Request a session with a mental health professional
3. Once approved, communicate through the private chat
4. Access crisis resources when needed

### For Mental Health Professionals
1. Create an account with the professional role
2. Approve or decline patient session requests
3. Manage multiple patient conversations
4. Initiate new sessions with patients

## Crisis Assessment Feature

MindfulChat includes an automated system to detect potentially concerning messages using keyword analysis. When a message contains crisis-related terms (such as "suicide" or "self-harm"), the system automatically provides a dialog with:

- Immediate access to crisis hotlines
- Crisis text line information
- Specialized resources (LGBTQ+, Veterans)
- Emergency service reminders

This feature aims to provide timely support resources without interrupting the therapeutic conversation.

## Security and Privacy

- **Row Level Security (RLS)**: Ensures users can only access data they're authorized to see
- **Encrypted Communication**: All data is transmitted over HTTPS
- **Authentication**: Secure user verification with Supabase Auth
- **Data Isolation**: Strict separation of chat sessions and user data

## Future Enhancements (Some cool stuff I could do with this)

- Video/audio sessions capability
- Mental health professional private notes.
- E2E encryption for chats (Worked on this for way too long, but needs more time than I can dedicate to it)
- Appointment scheduling
- Journaling features
- Expanded crisis resource localization

## License

I just did this for a fun interview challenge so imma just put this under COPYLEFT license, you may use it for whatever you want, enjoy!
