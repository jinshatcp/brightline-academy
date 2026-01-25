// Package config provides configuration management for the LiveClass application.
package config

import (
	"os"
	"strconv"
	"time"
)

// Config holds the application configuration.
type Config struct {
	// Server configuration
	Host       string
	Port       int
	InstanceID string // Unique instance ID for multi-instance deployments

	// HTTP Server performance settings
	ReadTimeout       time.Duration
	WriteTimeout      time.Duration
	IdleTimeout       time.Duration
	RequestTimeout    time.Duration
	EnableCompression bool

	// WebRTC configuration
	STUNServers  []string
	TURNServers  []string
	TURNUsername string
	TURNPassword string

	// MongoDB configuration
	MongoURI           string
	MongoDBName        string
	MongoMaxPoolSize   uint64
	MongoMinPoolSize   uint64
	MongoConnIdleTime  time.Duration
	MongoConnTimeout   time.Duration
	MongoSocketTimeout time.Duration

	// Redis configuration (for multi-instance)
	RedisEnabled bool
	RedisURL     string

	// Cache configuration
	CacheEnabled       bool
	UserCacheTTL       time.Duration
	BatchCacheTTL      time.Duration
	ScheduleCacheTTL   time.Duration
	CacheCleanupPeriod time.Duration

	// JWT configuration
	JWTSecret      string
	JWTExpiryHours int

	// Default admin credentials
	AdminEmail    string
	AdminPassword string
	AdminName     string

	// Storage configuration
	StoragePath string

	// Graceful shutdown
	ShutdownTimeout time.Duration
}

// Default returns the default configuration optimized for performance.
func Default() *Config {
	return &Config{
		Host:       getEnv("HOST", ""),
		Port:       getEnvInt("PORT", 8080),
		InstanceID: getEnv("INSTANCE_ID", generateInstanceID()),

		// HTTP Server performance - optimized timeouts
		ReadTimeout:       time.Duration(getEnvInt("READ_TIMEOUT_SEC", 30)) * time.Second,
		WriteTimeout:      time.Duration(getEnvInt("WRITE_TIMEOUT_SEC", 30)) * time.Second,
		IdleTimeout:       time.Duration(getEnvInt("IDLE_TIMEOUT_SEC", 120)) * time.Second,
		RequestTimeout:    time.Duration(getEnvInt("REQUEST_TIMEOUT_SEC", 15)) * time.Second,
		EnableCompression: getEnvBool("ENABLE_COMPRESSION", true),

		// STUN servers
		STUNServers: []string{
			"stun:stun.l.google.com:19302",
			"stun:stun1.l.google.com:19302",
			"stun:stun2.l.google.com:19302",
		},

		// TURN servers (for NAT traversal)
		TURNServers:  getEnvSlice("TURN_SERVERS", []string{}),
		TURNUsername: getEnv("TURN_USERNAME", ""),
		TURNPassword: getEnv("TURN_PASSWORD", ""),

		// MongoDB - optimized connection pool
		MongoURI:           getEnv("MONGO_URI", "mongodb://localhost:27017"),
		MongoDBName:        getEnv("MONGO_DB_NAME", "liveclass"),
		MongoMaxPoolSize:   uint64(getEnvInt("MONGO_MAX_POOL_SIZE", 100)),
		MongoMinPoolSize:   uint64(getEnvInt("MONGO_MIN_POOL_SIZE", 10)),
		MongoConnIdleTime:  time.Duration(getEnvInt("MONGO_CONN_IDLE_SEC", 30)) * time.Second,
		MongoConnTimeout:   time.Duration(getEnvInt("MONGO_CONN_TIMEOUT_SEC", 10)) * time.Second,
		MongoSocketTimeout: time.Duration(getEnvInt("MONGO_SOCKET_TIMEOUT_SEC", 30)) * time.Second,

		// Redis - for multi-instance deployments
		RedisEnabled: getEnvBool("REDIS_ENABLED", false),
		RedisURL:     getEnv("REDIS_URL", "redis://localhost:6379"),

		// Cache - fast in-memory caching (or Redis if enabled)
		CacheEnabled:       getEnvBool("CACHE_ENABLED", true),
		UserCacheTTL:       time.Duration(getEnvInt("USER_CACHE_TTL_SEC", 300)) * time.Second,    // 5 minutes
		BatchCacheTTL:      time.Duration(getEnvInt("BATCH_CACHE_TTL_SEC", 60)) * time.Second,    // 1 minute
		ScheduleCacheTTL:   time.Duration(getEnvInt("SCHEDULE_CACHE_TTL_SEC", 30)) * time.Second, // 30 seconds
		CacheCleanupPeriod: time.Duration(getEnvInt("CACHE_CLEANUP_SEC", 60)) * time.Second,      // 1 minute

		// JWT defaults
		JWTSecret:      getEnv("JWT_SECRET", "your-super-secret-jwt-key-change-in-production"),
		JWTExpiryHours: getEnvInt("JWT_EXPIRY_HOURS", 72),

		// Default admin (created on first run)
		AdminEmail:    getEnv("ADMIN_EMAIL", "admin@liveclass.com"),
		AdminPassword: getEnv("ADMIN_PASSWORD", "admin123"),
		AdminName:     getEnv("ADMIN_NAME", "Administrator"),

		// Storage (for recordings)
		StoragePath: getEnv("STORAGE_PATH", "./storage"),

		// Graceful shutdown
		ShutdownTimeout: time.Duration(getEnvInt("SHUTDOWN_TIMEOUT_SEC", 30)) * time.Second,
	}
}

// generateInstanceID generates a unique instance ID.
func generateInstanceID() string {
	hostname, _ := os.Hostname()
	return hostname + "-" + strconv.FormatInt(time.Now().UnixNano()%10000, 10)
}

// getEnvSlice retrieves a comma-separated environment variable as a slice.
func getEnvSlice(key string, defaultVal []string) []string {
	if val := os.Getenv(key); val != "" {
		var result []string
		for _, s := range splitAndTrim(val, ",") {
			if s != "" {
				result = append(result, s)
			}
		}
		if len(result) > 0 {
			return result
		}
	}
	return defaultVal
}

// splitAndTrim splits a string and trims whitespace from each part.
func splitAndTrim(s, sep string) []string {
	parts := make([]string, 0)
	for _, p := range stringsSplit(s, sep) {
		trimmed := stringsTrim(p)
		if trimmed != "" {
			parts = append(parts, trimmed)
		}
	}
	return parts
}

// stringsSplit is a simple split function.
func stringsSplit(s, sep string) []string {
	if s == "" {
		return nil
	}
	result := []string{}
	start := 0
	for i := 0; i <= len(s)-len(sep); i++ {
		if s[i:i+len(sep)] == sep {
			result = append(result, s[start:i])
			start = i + len(sep)
			i += len(sep) - 1
		}
	}
	result = append(result, s[start:])
	return result
}

// stringsTrim trims whitespace.
func stringsTrim(s string) string {
	start, end := 0, len(s)
	for start < end && (s[start] == ' ' || s[start] == '\t' || s[start] == '\n' || s[start] == '\r') {
		start++
	}
	for end > start && (s[end-1] == ' ' || s[end-1] == '\t' || s[end-1] == '\n' || s[end-1] == '\r') {
		end--
	}
	return s[start:end]
}

// Address returns the server address in host:port format.
func (c *Config) Address() string {
	return c.Host + ":" + strconv.Itoa(c.Port)
}

// getEnv retrieves an environment variable or returns a default value.
func getEnv(key, defaultVal string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return defaultVal
}

// getEnvInt retrieves an environment variable as int or returns a default value.
func getEnvInt(key string, defaultVal int) int {
	if val := os.Getenv(key); val != "" {
		if i, err := strconv.Atoi(val); err == nil {
			return i
		}
	}
	return defaultVal
}

// getEnvBool retrieves an environment variable as bool or returns a default value.
func getEnvBool(key string, defaultVal bool) bool {
	if val := os.Getenv(key); val != "" {
		if b, err := strconv.ParseBool(val); err == nil {
			return b
		}
	}
	return defaultVal
}
