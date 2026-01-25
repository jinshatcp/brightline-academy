# LiveClass

A real-time video streaming platform for online classes built with Go, React, and WebRTC.

## Features

- 📹 **Real-time Video Streaming** - Low-latency video using WebRTC
- 🎤 **Audio Support** - Full duplex audio with mute controls
- 🖥️ **Screen Sharing** - Share your screen with students
- 💬 **Live Chat** - Real-time messaging during class
- ✋ **Raise Hand** - Students can raise their hand to get attention
- 👥 **Participant List** - See who's in the class
- 🎨 **Modern UI** - Beautiful React + Tailwind CSS interface

## Tech Stack

### Backend
- **Go** - High-performance server
- **Pion WebRTC** - WebRTC implementation for Go
- **Gorilla WebSocket** - WebSocket handling

### Frontend
- **React 19** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS v4** - Styling

## Project Structure

```
learn/
├── cmd/
│   └── liveclass/              # Application entry point
│       ├── main.go             # Entry point with embed
│       └── dist/               # Built React app (embedded)
├── internal/
│   ├── config/                 # Configuration management
│   │   └── config.go
│   ├── room/                   # Room and participant management
│   │   ├── hub.go
│   │   ├── room.go
│   │   └── participant.go
│   ├── rtc/                    # WebRTC service
│   │   └── webrtc.go
│   └── server/                 # HTTP/WebSocket server
│       ├── server.go
│       ├── handler.go
│       └── conn.go
├── web/                        # React frontend source
│   ├── src/
│   │   ├── components/         # React components
│   │   ├── context/            # WebSocket context
│   │   ├── hooks/              # Custom hooks (useWebRTC)
│   │   └── types/              # TypeScript types
│   ├── package.json
│   └── vite.config.ts
├── go.mod
├── go.sum
└── README.md
```

## Requirements

- Go 1.24+ (local development)
- Node.js 20+ (local development)
- Docker & Docker Compose (containerized)
- Modern browser with WebRTC support

## Quick Start

### 🐳 Docker (Recommended)

The easiest way to run LiveClass:

```bash
# Clone and run
docker compose up -d

# With MongoDB Express UI (development)
docker compose --profile dev up -d
```

Access the app at `http://localhost:8080`

**Configuration:**
```bash
# Copy and modify environment variables
cp env.example .env

# Edit .env with your settings
nano .env

# Rebuild with new settings
docker compose up -d --build
```

### Docker Commands

```bash
# Build fresh
docker compose build --no-cache

# View logs
docker compose logs -f app

# Stop all services
docker compose down

# Stop and remove volumes (reset database)
docker compose down -v
```

### 🚀 Multi-Instance Mode (Horizontal Scaling)

Enable Redis for multi-instance deployments:

```bash
# Start with Redis enabled
REDIS_ENABLED=true docker compose --profile multi up -d
```

### ☸️ Kubernetes Deployment

Deploy to Kubernetes:

```bash
# Apply all manifests
kubectl apply -k k8s/

# Or apply individually
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secret.yaml
kubectl apply -f k8s/mongodb.yaml
kubectl apply -f k8s/redis.yaml
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/ingress.yaml
kubectl apply -f k8s/hpa.yaml

# Check status
kubectl -n liveclass get pods
kubectl -n liveclass get svc

# View logs
kubectl -n liveclass logs -f deployment/liveclass

# Scale manually
kubectl -n liveclass scale deployment/liveclass --replicas=5
```

**K8s Features:**
- ✅ Horizontal Pod Autoscaler (HPA) - scales 2-10 pods based on CPU/memory
- ✅ Redis for shared state across pods
- ✅ Liveness & Readiness probes
- ✅ Graceful shutdown handling
- ✅ Rolling updates with zero downtime

### Development

1. **Start the Go backend:**
```bash
go run ./cmd/liveclass
```

2. **Start the React dev server (with hot reload):**
```bash
cd web
npm install
npm run dev
```

The React dev server runs on `http://localhost:3000` and proxies WebSocket to the Go backend on port 8080.

### Production Build

1. **Build the React frontend:**
```bash
cd web
npm install
npm run build
```
(Vite builds directly to `cmd/liveclass/dist/`)

2. **Build the Go binary:**
```bash
go build -o liveclass ./cmd/liveclass
```

3. **Run:**
```bash
./liveclass
```

Or use the one-liner:
```bash
cd web && npm run build && cd .. && go build -o liveclass ./cmd/liveclass && ./liveclass
```

### Configuration

Environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `HOST`   | ``      | Server host (empty = all interfaces) |
| `PORT`   | `8080`  | Server port |

## Usage

### As Presenter (Teacher)

1. Open `http://localhost:8080`
2. Enter your name
3. Select **Presenter** role
4. Click **Create Class**
5. Allow camera/microphone access
6. Share the room code with students

### As Student

1. Open `http://localhost:8080`
2. Enter your name
3. Select **Student** role
4. Enter the room code from your teacher
5. Click **Join Class**
6. Watch the stream!

### Controls

**Presenter:**
- 📹 Toggle camera
- 🎤 Toggle microphone  
- 🖥️ Share screen
- ⏹️ Stop sharing
- 📞 Leave class

**Student:**
- ✋ Raise hand
- 📞 Leave class

## Architecture

The application uses a Selective Forwarding Unit (SFU) architecture:

```
┌─────────────┐        ┌─────────────┐
│  Presenter  │───────▶│   Server    │
│  (Browser)  │◀───────│   (Go/SFU)  │
└─────────────┘        └──────┬──────┘
                              │
                    ┌─────────┼─────────┐
                    │         │         │
                    ▼         ▼         ▼
              ┌─────────┐ ┌─────────┐ ┌─────────┐
              │ Viewer 1│ │ Viewer 2│ │ Viewer N│
              └─────────┘ └─────────┘ └─────────┘
```

1. **Presenter** sends video/audio to the **Server**
2. **Server** forwards streams to all **Viewers**

This is more efficient than mesh topology for one-to-many streaming.
 <!--
 # Usage
./run.sh              # Single instance on :8080
./run.sh -f           # Build frontend first
./run.sh multi        # 2 instances with Redis
./run.sh docker       # Docker Compose
./run.sh stop         # Stop all
./run.sh -h           # Help
  --> 


## License

MIT
