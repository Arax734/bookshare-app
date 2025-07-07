# BookShare App

BookShare is a web application designed to facilitate the sharing and exchange of books among users. Built with Next.js, React, Firebase, and Tailwind CSS, the app provides a modern, user-friendly interface for managing personal libraries, discovering new books, and connecting with other book enthusiasts.

## Features

- **User Profiles:** View and manage your profile, including your book collection and books available for exchange.
- **Book Exchange:** List books for exchange, browse books from other users, and initiate exchanges.
- **Book Search & Recommendations:** Search for books by title or author, and receive personalized recommendations.
- **Reviews & Ratings:** Leave reviews and ratings for books you've read.
- **Authentication:** Secure login and session management.
- **Responsive Design:** Optimized for both desktop and mobile devices.

## Tech Stack

- **Frontend:** Next.js, React, Tailwind CSS
- **Backend:** Firebase (Firestore, Authentication)
- **Testing:** Jest
- **Other:** ESLint, PostCSS

## Getting Started

1. **Clone the repository:**
   ```sh
   git clone <repository-url>
   cd bookshare-app
   ```
2. **Install dependencies:**
   ```sh
   pnpm install
   # or
   npm install
   ```
3. **Configure Firebase:**
   - Copy `env.example` to `.env.local` and fill in your Firebase credentials.
   - Update `firebase/config.ts` if needed.
4. **Run the development server:**
   ```sh
   pnpm dev
   # or
   npm run dev
   ```
   The app will be available at [http://localhost:3000](http://localhost:3000).

## Scripts

- `dev` - Start the development server
- `build` - Build the application for production
- `start` - Start the production server
- `lint` - Run ESLint
- `test` - Run tests with Jest
- `test:coverage` - Run tests with coverage report

## Project Structure

- `app/` - Main application code (pages, components, hooks, layouts, etc.)
- `firebase/` - Firebase configuration
- `public/` - Static assets
- `__tests__/` - Test files

---

**This is not an open source license.**

The code is provided for viewing and educational purposes only. All rights reserved.  
Copying, modifying, distributing, or using the code in whole or in part without the author's written permission is strictly prohibited.
