# Premium Data Portal - Government Travel Rates

A modern, luxury data portal showcasing government travel rates with premium UX design.

## ✨ Features

### 🎨 Premium Design
- **Glassmorphism Effects**: Translucent panels with backdrop blur
- **Gradient Accents**: Deep navy + gold gradient theme
- **Smooth Animations**: Framer Motion micro-interactions
- **Typography**: Inter + Playfair Display pairing
- **Dark Mode**: Premium dark theme with accent lighting

### 📊 Data Portal
- **Interactive Tables**: Search, sort, filter, and export per-diem and accommodation rates
- **Animated Counters**: Real-time statistics with smooth counting animations
- **CSV Export**: One-click data export for analysis
- **Pagination**: Smooth navigation through large datasets
- **Responsive Design**: Works beautifully on all devices

### 🛫 Travel Integration
- **OpenFlights Data**: Free, open-source flight data (6,072+ airports)
- **Rate Coverage**: 233 countries, 9,114 per-diem entries, 1,356 accommodation rates
- **Real-time Search**: Fast database queries with caching

## 🚀 Quick Start

### Development
```bash
# Install dependencies
npm install

# Start backend server
npm start

# Start frontend dev server (in another terminal)
npm run dev:client
```

Backend runs on `http://localhost:5001`  
Frontend runs on `http://localhost:3000`

### Production Build
```bash
# Build React frontend
npm run build:client

# Start production server (serves built React app)
NODE_ENV=production npm start
```

## 🏗️ Architecture

### Frontend (`/client`)
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite 7
- **Styling**: Tailwind CSS 4 with custom theme
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **UI Components**: Custom-built with Radix UI primitives

### Backend
- **Server**: Node.js + Express
- **Database**: SQLite3 with Better-SQLite3
- **APIs**: 
  - `/api/rates/per-diem` - All per-diem rates
  - `/api/rates/accommodations` - Canadian accommodation rates
  - `/api/stats` - Portal statistics
  - `/api/flights/search` - OpenFlights integration

### Key Files
```
├── client/
│   ├── src/
│   │   ├── App.tsx              # Main application
│   │   ├── pages/
│   │   │   ├── LandingPage.tsx  # Hero + animated counters
│   │   │   └── DashboardPage.tsx # Data tables portal
│   │   ├── components/
│   │   │   └── DataTable.tsx    # Interactive table component
│   │   └── lib/
│   │       └── utils.ts         # Utilities (format, export)
│   └── index.html               # Entry point
├── server.js                    # Express backend
├── openFlightsService.js        # Free flight data integration
└── services/
    └── databaseService.js       # Database layer
```

## 🎨 Design System

### Colors
- **Background**: Deep navy (#0B1120)
- **Accent**: Gold gradient (#FACC15 → #EAB308)
- **Glass**: rgba(255, 255, 255, 0.1) with 10px blur
- **Text**: White (#FAFAFA) with gray-300 secondary

### Typography
- **Headings**: Playfair Display (Display font)
- **Body**: Inter (Sans-serif)
- **Weights**: 300-900 range

### Spacing
- **Container**: max-width 1200px, px-4 mobile
- **Sections**: py-20 desktop, py-12 mobile
- **Cards**: p-8 with rounded-2xl

## 📦 npm Scripts

| Script | Description |
|--------|-------------|
| `npm start` | Start production server |
| `npm run dev` | Start backend with nodemon |
| `npm run dev:client` | Start Vite dev server |
| `npm run build:client` | Build React app for production |
| `npm run preview` | Preview production build |
| `npm test` | Run Jest tests |

## 🔧 Configuration

### Environment Variables (`.env`)
```env
PORT=5001
NODE_ENV=production
AMADEUS_API_KEY=your_key_here  # Optional
AMADEUS_API_SECRET=your_secret # Optional
```

### Vite Configuration
- Root: `./client`
- Output: `../dist/client`
- Proxy: `/api` → `http://localhost:5001`

## 📊 Data Sources

1. **NJC Travel Directive** - Canadian government per-diem rates
2. **OpenFlights** - Free, open-source airport/airline/route data
3. **Scraped Data** - Government accommodation rates (scraped via Python)

## 🚀 Deployment

### Docker
```bash
# Build image with React app
docker build -t govt-travel-app:latest .

# Run container
docker run -d -p 5001:5001 govt-travel-app:latest
```

### Manual
```bash
# Build frontend
npm run build:client

# Set production environment
export NODE_ENV=production

# Start server
npm start
```

The server automatically serves the built React app when `NODE_ENV=production` and `/dist/client` exists.

## 🎯 Future Enhancements

- [ ] Interactive map view with country selection
- [ ] Data visualizations with Recharts (rate comparisons)
- [ ] Advanced filters (date ranges, rate thresholds)
- [ ] User authentication and saved searches
- [ ] Real-time Amadeus flight pricing integration
- [ ] Mobile app (React Native)

## 📝 License

ISC

## 🤝 Contributing

Built with premium attention to detail. Contributions welcome!

---

**Made with ✨ by the Government Travel Team**
