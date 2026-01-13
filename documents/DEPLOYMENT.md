# Deployment Guide

## 🚀 Quick Start (Node.js)

### Prerequisites
- Node.js 14+ installed
- npm installed

### Installation & Run

```bash
# Install dependencies
npm install

# Start the server
npm start
```

The application will be available at: **http://localhost:5001**

---

## 🐳 Docker Deployment

### Prerequisites
- Docker installed
- Docker Compose installed (optional)

### Option 1: Docker Build & Run

```bash
# Build the Docker image
docker build -t govt-travel-estimator .

# Run the container
docker run -d --env-file .env -p 5001:5001 --name govt-travel-app govt-travel-estimator
```

### Option 2: Docker Compose (Recommended)

```bash
# Start the container
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the container
docker-compose down
```

### Verify Deployment

```bash
# Check container status
docker ps

# View logs
docker logs govt-travel-estimator

# Test the application
curl http://localhost:5001
```

> **Note:** Docker builds can run without Amadeus credentials. When the API keys are missing, flight search falls back to curated sample flights (see `data/sampleFlights.json`) so you can still exercise the UI. Add `AMADEUS_API_KEY` and `AMADEUS_API_SECRET` later to unlock live pricing. Make sure you create a `.env` file based on `.env.example` and the Compose service loads it via `env_file`, or pass it via `--env-file` when using `docker run`.

---

## 🌐 Access Points

Once deployed, access the application:

- **Main Application**: http://localhost:5001
- **Validation Dashboard**: http://localhost:5001/validation.html

---

## 🔧 Configuration

### Change Port

**In server.js:**
```javascript
const PORT = 5001; // Change this value
```

**In docker-compose.yml:**
```yaml
ports:
  - "5001:5001" # Change first value (host port)
```

---

## 📁 File Structure

```
Govt Travel App/
├── server.js              # Express server
├── package.json           # Dependencies
├── Dockerfile            # Docker configuration
├── docker-compose.yml    # Docker Compose config
├── index.html            # Main app
├── validation.html       # Validation dashboard
├── styles.css            # Styling
├── script.js             # Application logic
└── data/                 # Rate databases
    ├── perDiemRates.json
    ├── accommodationRates.json
    └── transportationRates.json
```

---

## 🔄 Updating Rate Databases

### Without Stopping Server

If using Docker with volume mount:

```bash
# Edit the JSON files in ./data/
# Changes are reflected immediately (read-only mount)
```

### With Server Restart

```bash
# Stop the server
npm stop  # or docker-compose down

# Update JSON files in ./data/

# Restart the server
npm start  # or docker-compose up -d
```

---

## 🛠️ Troubleshooting

### Port Already in Use

```bash
# Windows
netstat -ano | findstr :5001
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:5001 | xargs kill -9
```

### Cannot Find Module 'express'

```bash
npm install
```

### Docker Container Won't Start

```bash
# Check logs
docker logs govt-travel-estimator

# Remove and rebuild
docker-compose down
docker-compose up --build
```

---

## 🔒 Production Considerations

### Security
- [ ] Add HTTPS/SSL certificate
- [ ] Enable CORS policies
- [ ] Add rate limiting
- [ ] Implement authentication (if needed)

### Performance
- [ ] Enable gzip compression
- [ ] Add caching headers
- [ ] Use CDN for static assets
- [ ] Implement load balancing

### Monitoring
- [ ] Add logging system
- [ ] Implement health checks
- [ ] Set up uptime monitoring
- [ ] Configure alerts

---

## 📊 Server Commands

### Development
```bash
npm start           # Start server
npm run dev         # Start in dev mode (same as start)
```

### Docker
```bash
docker-compose up           # Start with logs
docker-compose up -d        # Start in background
docker-compose down         # Stop and remove
docker-compose restart      # Restart services
docker-compose logs -f      # Follow logs
```

---

## 🌍 Deployment Options

### Local Network Access

To access from other devices on your network:

1. Find your IP address:
   ```bash
   # Windows
   ipconfig
   
   # Linux/Mac
   ifconfig
   ```

2. Update server.js:
   ```javascript
   app.listen(PORT, '0.0.0.0', () => {
       // Server accessible on network
   });
   ```

3. Access from other devices:
   ```
   http://<your-ip>:5001
   ```

### Cloud Deployment

**Heroku:**
```bash
heroku create govt-travel-estimator
git push heroku main
```

**AWS/Azure/GCP:**
- Use container services (ECS, App Service, Cloud Run)
- Deploy Docker image
- Configure port 5001

---

## ✅ Health Check

Verify the server is running:

```bash
# Command line
curl http://localhost:5001

# Browser
Open: http://localhost:5001
```

Expected: Application loads successfully

---

## 📝 Environment Variables

Create `.env` file for configuration:

```bash
PORT=5001
NODE_ENV=production
LOG_LEVEL=info
```

Update server.js to use:
```javascript
const PORT = process.env.PORT || 5001;
```

---

## 🔄 Auto-Restart on Changes

Using nodemon for development:

```bash
# Install nodemon
npm install --save-dev nodemon

# Update package.json
"scripts": {
  "start": "node server.js",
  "dev": "nodemon server.js"
}

# Run with auto-restart
npm run dev
```

---

**Deployment Guide Version:** 1.0  
**Last Updated:** October 30, 2025  
**Port:** 5001  
**Protocol:** HTTP
