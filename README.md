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

## Vercel Deployment (Client Fix Applied)

### Client Project Configuration
1. **Vercel Dashboard Settings**:
   | Setting          | Value            |
   |------------------|------------------|
   | Root Directory  | `client`        |
   | Build Command   | `npm run build` |
   | Output Directory| `dist`          |
   | Install Command | `npm install`   |

2. **Environment Variables** (Client project):
   | Name       | Value                                      |
   |------------|--------------------------------------------|
   | `VITE_API_URL` | `https://your-manwhanted-server.vercel.app/api` (replace with server URL) |

3. **Files Updated**:
   - `client/package.json`: Added TypeScript deps + `"type": "module"`.
   - `client/tsconfig.json`: `target: "ES2020"`, `moduleResolution: "bundler"`.
   - `client/.env.example`: VITE_API_URL template.
   - `client/vercel.json`: Already correct (static-build, distDir).

### Server Project
- Root Directory: `server`
- Env Vars: `MONGO_URI`, `JWT_SECRET`

4. **Usage**:
   - Copy `client/.env.example` → `.env` locally (Vite loads as `import.meta.env.VITE_API_URL`).
   - Push commits → auto-redeploy.
   - Test API: Client should use VITE_API_URL (not localhost).

**Root vercel.json** remains for monorepo proxy if deploying combined.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any enhancements or bug fixes.

## License

This project is licensed under the MIT License. See the LICENSE file for details.
