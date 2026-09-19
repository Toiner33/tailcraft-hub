# TailCraft Hub

TailCraft Hub is a modern, web-based dashboard designed to manage a local Minecraft server running in a Docker container. It provides an intuitive interface for controlling the server, managing configurations, monitoring performance, and executing remote commands.

## 🚀 Key Features

### 🎮 Server Management
- **Lifecycle Control:** Start, stop, and restart your Minecraft server with a single click.
- **RCON Console:** Real-time remote command execution (RCON) for direct server interaction.
- **Docker Integration:** Deep integration with Docker to monitor container status and view real-time logs.

### ⚙️ Configuration & Maintenance
- **Property Editor:** Easily edit `server.properties` through a clean web interface.
- **Game Rule Panel:** Manage Minecraft gamerules with live synchronization (via RCON) or local config fallback.
- **Backup System:** Create and manage compressed `.tar.gz` backups of your world files.
- **World Management:** Tools for resetting worlds and managing dimensions.

### 📊 Monitoring & Analytics
- **Resource Metrics:** Real-time monitoring of CPU, RAM (Container & Host), and Disk usage.
- **Dimension Analytics:** Track data and statistics specific to different Minecraft dimensions.

## 🛠️ Technical Architecture

TailCraft Hub is split into two main components:

1.  **The Backend (Dockerized Minecraft):**
    - Uses **PaperMC** for an optimized, high-performance server environment.
    - Orchestrated via **Docker Compose**.
    - Data persistence is handled through local volume mapping in the `data/` directory.

2.  **The Frontend (Dashboard):**
    - Built with **Next.js**, **TypeScript**, and **Tailwind CSS**.
    - Communicates with the Minecraft server via the **RCON protocol**.
    - Communicates with the Docker engine via the **Docker Socket API**.

## 🏁 Getting Started

### Prerequisites
- [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/) installed.
- [Node.js](https://nodejs.org/) (for running the dashboard locally).

### Running the Full Stack
1.  **Start the Minecraft Server:**
    ```bash
    docker-compose up -d
    ```
2.  **Start the Dashboard:**
    ```bash
    cd web
    npm install
    npm run dev
    ```
3.  **Access the Dashboard:**
    Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📦 Project Structure

```text
.
├── data/               # Minecraft server files (mapped to Docker)
├── dev/                # Development/test server instances
├── web/                # Next.js Dashboard application
│   ├── app/            # Next.js App Router (API routes & pages)
│   ├── components/     # UI Components
│   ├── lib/            # Core logic (Docker, RCON, Config)
│   └── types/          # TypeScript definitions
└── docker-compose.yaml # Docker orchestration
```
