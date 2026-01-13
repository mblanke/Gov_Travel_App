const NodeCache = require('node-cache');
const logger = require('./logger');

/**
 * Cache Service
 * Provides in-memory caching for API responses
 */
class CacheService {
    constructor() {
        // Flight cache: 1 hour TTL
        this.flightCache = new NodeCache({
            stdTTL: 3600,
            checkperiod: 600,
            useClones: false
        });

        // Rate cache: 24 hours TTL (rates don't change often)
        this.rateCache = new NodeCache({
            stdTTL: 86400,
            checkperiod: 3600,
            useClones: false
        });

        // Database query cache: 5 minutes TTL
        this.dbCache = new NodeCache({
            stdTTL: 300,
            checkperiod: 60,
            useClones: false
        });

        // Set up event listeners
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Flight cache events
        this.flightCache.on('set', (key, value) => {
            logger.debug(`Flight cache SET: ${key}`);
        });

        this.flightCache.on('expired', (key, value) => {
            logger.debug(`Flight cache EXPIRED: ${key}`);
        });

        // Rate cache events
        this.rateCache.on('set', (key, value) => {
            logger.debug(`Rate cache SET: ${key}`);
        });

        // DB cache events
        this.dbCache.on('set', (key, value) => {
            logger.debug(`DB cache SET: ${key}`);
        });
    }

    /**
     * Generate cache key for flight searches
     */
    generateFlightKey(origin, destination, departureDate, returnDate, adults = 1) {
        return `flight:${origin}:${destination}:${departureDate}:${returnDate}:${adults}`.toLowerCase();
    }

    /**
     * Generate cache key for accommodation searches
     */
    generateAccommodationKey(city) {
        return `accommodation:${city}`.toLowerCase();
    }

    /**
     * Generate cache key for database queries
     */
    generateDbKey(query, params) {
        const paramStr = params ? JSON.stringify(params) : '';
        return `db:${query}:${paramStr}`.toLowerCase();
    }

    /**
     * Get flight from cache
     */
    getFlight(origin, destination, departureDate, returnDate, adults) {
        const key = this.generateFlightKey(origin, destination, departureDate, returnDate, adults);
        const cached = this.flightCache.get(key);
        
        if (cached) {
            logger.info(`Flight cache HIT: ${key}`);
            return cached;
        }
        
        logger.debug(`Flight cache MISS: ${key}`);
        return null;
    }

    /**
     * Set flight in cache
     */
    setFlight(origin, destination, departureDate, returnDate, adults, data) {
        const key = this.generateFlightKey(origin, destination, departureDate, returnDate, adults);
        this.flightCache.set(key, data);
        logger.info(`Flight cached: ${key}`);
    }

    /**
     * Get accommodation rate from cache
     */
    getAccommodation(city) {
        const key = this.generateAccommodationKey(city);
        const cached = this.rateCache.get(key);
        
        if (cached) {
            logger.debug(`Accommodation cache HIT: ${key}`);
            return cached;
        }
        
        logger.debug(`Accommodation cache MISS: ${key}`);
        return null;
    }

    /**
     * Set accommodation rate in cache
     */
    setAccommodation(city, data) {
        const key = this.generateAccommodationKey(city);
        this.rateCache.set(key, data);
        logger.debug(`Accommodation cached: ${key}`);
    }

    /**
     * Get database query result from cache
     */
    getDbQuery(query, params) {
        const key = this.generateDbKey(query, params);
        return this.dbCache.get(key);
    }

    /**
     * Set database query result in cache
     */
    setDbQuery(query, params, data) {
        const key = this.generateDbKey(query, params);
        this.dbCache.set(key, data);
    }

    /**
     * Clear specific cache
     */
    clearFlightCache() {
        this.flightCache.flushAll();
        logger.info('Flight cache cleared');
    }

    clearRateCache() {
        this.rateCache.flushAll();
        logger.info('Rate cache cleared');
    }

    clearDbCache() {
        this.dbCache.flushAll();
        logger.info('DB cache cleared');
    }

    /**
     * Clear all caches
     */
    clearAll() {
        this.clearFlightCache();
        this.clearRateCache();
        this.clearDbCache();
        logger.info('All caches cleared');
    }

    /**
     * Get cache statistics
     */
    getStats() {
        return {
            flights: this.flightCache.getStats(),
            rates: this.rateCache.getStats(),
            database: this.dbCache.getStats()
        };
    }
}

// Export singleton instance
module.exports = new CacheService();
