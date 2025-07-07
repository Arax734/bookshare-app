# BookShare App (Web)

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

# BookShare Mobile App

BookShare Mobile is a cross-platform mobile application (Android & iOS) built with Expo, React Native, and Firebase. It allows users to access BookShare features on the go, including book exchange, library management, and social features, with a native mobile experience.

## Mobile App Features

- **User Authentication:** Secure login and registration (email, Google, Facebook)
- **Book Exchange:** Browse, add, and manage books for exchange
- **Personal Library:** Manage your own book collection
- **Contacts & Invites:** Connect with other users, send/receive invites
- **Notifications:** Stay up to date with exchanges and invites
- **Reviews & Ratings:** Leave and view book reviews
- **Modern UI:** Built with React Native, NativeWind (Tailwind CSS for RN), and Expo

## Mobile Tech Stack

- **Framework:** Expo, React Native
- **UI:** NativeWind (Tailwind CSS for React Native)
- **State Management:** React Context
- **Backend:** Firebase (Firestore, Authentication)

## Getting Started (Mobile)

1. **Navigate to the mobile app folder:**
   ```sh
   cd bookshare-app-mobile
   ```
2. **Install dependencies:**
   ```sh
   npm install
   # or
   pnpm install
   ```
3. **Configure Firebase:**
   - Copy `firebase/config.example.ts` to `firebase/config.ts` and fill in your Firebase credentials.
   - (Optional) Copy `firebase/firebase.config.example.ts` to `firebase/firebase.config.ts` if needed.
4. **Start the app:**
   ```sh
   npm start
   # or
   pnpm start
   ```
   Then follow Expo CLI instructions to run on Android/iOS simulator or a real device.

---

**This is not an open source license.**

The code is provided for viewing and educational purposes only. All rights reserved.  
Copying, modifying, distributing, or using the code in whole or in part without the author's written permission is strictly prohibited.
