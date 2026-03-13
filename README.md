# Manwhanted

Manwhanted is a full-stack web application that mimics the core features and design of Asura Scans. This project is built using React for the client-side and Node.js with Express for the server-side.

## Features

- User authentication and authorization
- Browse and read manga
- Search functionality
- User comments and ratings
- Responsive design

## Project Structure

```
Manwhanted
├── client
│   ├── src
│   │   ├── components
│   │   ├── pages
│   │   ├── styles
│   │   └── index.tsx
│   ├── package.json
│   └── tsconfig.json
├── server
│   ├── src
│   │   ├── controllers
│   │   ├── models
│   │   ├── routes
│   │   └── index.ts
│   ├── package.json
│   └── tsconfig.json
├── package.json
└── README.md
```

## Getting Started

### Prerequisites

- Node.js
- npm or yarn
- MongoDB (or any other database of your choice)

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/Manwhanted.git
   ```

2. Navigate to the client directory and install dependencies:
   ```
   cd Manwhanted/client
   npm install
   ```

3. Navigate to the server directory and install dependencies:
   ```
   cd ../server
   npm install
   ```

### Running the Application

1. Start the server:
   ```
   cd Manwhanted/server
   npm start
   ```

2. In a new terminal, start the client:
   ```
   cd Manwhanted/client
   npm start
   ```

### Usage

- Open your browser and go to `http://localhost:3000` to access the application.
- Explore the features and enjoy reading manga!

## Vercel Deployment

1. **Create Separate Projects** (recommended for monorepo):
   - Client: Vercel Dashboard → New Project → Import repo → Root Directory: `client`
   - Server: New Project → Root Directory: `server`

2. **Environment Variables** (Server project):
   - `MONGO_URI`: MongoDB connection string
   - `JWT_SECRET`: Secure random string (e.g., `openssl rand -base64 32`)

3. **Root vercel.json** (optional for combined client deploy with API proxy):
   - Update `rewrites` destination to your server URL (e.g., `https://manwhanted-server-abc.vercel.app/api/$1`)

4. Deploy and test!

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any enhancements or bug fixes.

## License

This project is licensed under the MIT License. See the LICENSE file for details.
