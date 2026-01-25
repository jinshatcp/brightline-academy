package server

import (
	"context"
	"embed"
	"fmt"
	"io/fs"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/jinshatcp/brightline-academy/learn/internal/auth"
	"github.com/jinshatcp/brightline-academy/learn/internal/config"
	"github.com/jinshatcp/brightline-academy/learn/internal/database"
	"github.com/jinshatcp/brightline-academy/learn/internal/middleware"
	"github.com/jinshatcp/brightline-academy/learn/internal/pubsub"
	"github.com/jinshatcp/brightline-academy/learn/internal/repository"
	"github.com/jinshatcp/brightline-academy/learn/internal/room"
	"github.com/jinshatcp/brightline-academy/learn/internal/rtc"
)

// Server represents the LiveClass HTTP server.
type Server struct {
	config           *config.Config
	hub              *room.Hub
	rtcService       *rtc.Service
	staticFS         fs.FS
	db               *database.MongoDB
	pubsub           *pubsub.RedisPubSub
	userRepo         *repository.UserRepository
	batchRepo        *repository.BatchRepository
	scheduleRepo     *repository.ScheduleRepository
	recordingRepo    *repository.RecordingRepository
	noteRepo         *repository.NoteRepository
	authService      *auth.Service
	authHandler      *AuthHandler
	adminHandler     *AdminHandler
	batchHandler     *BatchHandler
	scheduleHandler  *ScheduleHandler
	recordingHandler *RecordingHandler
	noteHandler      *NoteHandler
	httpServer       *http.Server
}

// New creates a new Server instance.
func New(cfg *config.Config, staticFiles embed.FS, staticDir string) (*Server, error) {
	staticFS, err := fs.Sub(staticFiles, staticDir)
	if err != nil {
		return nil, fmt.Errorf("failed to create static file system: %w", err)
	}

	// Connect to MongoDB with optimized settings
	log.Println("📦 Connecting to MongoDB...")
	dbConfig := &database.ConnectionConfig{
		URI:                    cfg.MongoURI,
		DBName:                 cfg.MongoDBName,
		MaxPoolSize:            cfg.MongoMaxPoolSize,
		MinPoolSize:            cfg.MongoMinPoolSize,
		MaxConnIdleTime:        cfg.MongoConnIdleTime,
		ConnectTimeout:         cfg.MongoConnTimeout,
		ServerSelectionTimeout: 5 * time.Second,
		SocketTimeout:          cfg.MongoSocketTimeout,
		MaxConnecting:          10,
	}

	db, err := database.NewMongoDBWithConfig(dbConfig)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to MongoDB: %w", err)
	}
	log.Println("✅ MongoDB connected")

	// Connect to Redis if enabled (for multi-instance)
	var ps *pubsub.RedisPubSub
	if cfg.RedisEnabled {
		log.Println("🔴 Connecting to Redis...")
		ps, err = pubsub.NewRedisPubSub(cfg.RedisURL, cfg.InstanceID)
		if err != nil {
			return nil, fmt.Errorf("failed to connect to Redis: %w", err)
		}
		log.Println("✅ Redis connected (multi-instance mode enabled)")
	} else {
		log.Println("📝 Running in single-instance mode (Redis disabled)")
	}

	// Create repositories with caching
	userRepo := repository.NewUserRepositoryWithCache(db, cfg.UserCacheTTL)
	batchRepo := repository.NewBatchRepositoryWithCache(db, cfg.BatchCacheTTL)
	scheduleRepo := repository.NewScheduleRepositoryWithCache(db, cfg.ScheduleCacheTTL)
	recordingRepo := repository.NewRecordingRepository(db)
	noteRepo := repository.NewNoteRepository(db.Database)

	// Create indexes in background with own context
	go func() {
		indexCtx, indexCancel := context.WithTimeout(context.Background(), 60*time.Second)
		defer indexCancel()

		if err := userRepo.CreateIndexes(indexCtx); err != nil {
			log.Printf("⚠️ Warning: Failed to create user indexes: %v", err)
		}
		if err := batchRepo.CreateIndexes(indexCtx); err != nil {
			log.Printf("⚠️ Warning: Failed to create batch indexes: %v", err)
		}
		if err := scheduleRepo.CreateIndexes(indexCtx); err != nil {
			log.Printf("⚠️ Warning: Failed to create schedule indexes: %v", err)
		}
		if err := recordingRepo.CreateIndexes(indexCtx); err != nil {
			log.Printf("⚠️ Warning: Failed to create recording indexes: %v", err)
		}
		if err := noteRepo.CreateIndexes(indexCtx); err != nil {
			log.Printf("⚠️ Warning: Failed to create note indexes: %v", err)
		}
		log.Println("✅ Database indexes created")
	}()

	// Context for admin creation
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Create auth service
	authService := auth.NewService(userRepo, cfg.JWTSecret, cfg.JWTExpiryHours)

	// Create default admin
	if err := authService.CreateDefaultAdmin(ctx, cfg.AdminEmail, cfg.AdminPassword, cfg.AdminName); err != nil {
		log.Printf("⚠️ Warning: Failed to create default admin: %v", err)
	} else {
		log.Printf("👤 Default admin ready: %s", cfg.AdminEmail)
	}

	// Create handlers
	authHandler := NewAuthHandler(authService)
	adminHandler := NewAdminHandler(authService, userRepo)
	batchHandler := NewBatchHandler(authService, batchRepo, userRepo)
	scheduleHandler := NewScheduleHandler(authService, scheduleRepo, batchRepo, userRepo)
	recordingHandler := NewRecordingHandler(authService, recordingRepo, scheduleRepo, batchRepo, userRepo, cfg.StoragePath)
	noteHandler := NewNoteHandler(authService, noteRepo, batchRepo, userRepo, cfg.StoragePath)

	log.Printf("📹 Recordings will be saved to: %s/recordings", cfg.StoragePath)
	log.Printf("📄 Notes will be saved to: %s/notes", cfg.StoragePath)
	if cfg.CacheEnabled {
		log.Printf("⚡ Caching enabled (User: %v, Batch: %v, Schedule: %v)", cfg.UserCacheTTL, cfg.BatchCacheTTL, cfg.ScheduleCacheTTL)
	}

	return &Server{
		config:           cfg,
		hub:              room.NewHub(),
		rtcService:       rtc.NewService(cfg.STUNServers),
		staticFS:         staticFS,
		db:               db,
		pubsub:           ps,
		userRepo:         userRepo,
		batchRepo:        batchRepo,
		scheduleRepo:     scheduleRepo,
		recordingRepo:    recordingRepo,
		noteRepo:         noteRepo,
		authService:      authService,
		authHandler:      authHandler,
		adminHandler:     adminHandler,
		batchHandler:     batchHandler,
		scheduleHandler:  scheduleHandler,
		recordingHandler: recordingHandler,
		noteHandler:      noteHandler,
	}, nil
}

// Run starts the HTTP server and blocks until it exits.
func (s *Server) Run() error {
	handler := NewHandler(s.hub, s.rtcService)

	mux := http.NewServeMux()

	// Auth routes
	mux.HandleFunc("/api/auth/register", s.authHandler.Register)
	mux.HandleFunc("/api/auth/login", s.authHandler.Login)
	mux.HandleFunc("/api/auth/me", s.authHandler.Me)
	mux.HandleFunc("/api/auth/change-password", s.authHandler.ChangePassword)

	// Admin routes
	mux.HandleFunc("/api/admin/users", s.adminHandler.requireAdmin(s.adminHandler.ListUsers))
	mux.HandleFunc("/api/admin/users/pending", s.adminHandler.requireAdmin(s.adminHandler.GetPendingUsers))
	mux.HandleFunc("/api/admin/stats", s.adminHandler.requireAdmin(s.adminHandler.GetStats))
	mux.HandleFunc("/api/admin/users/", s.adminHandler.requireAdmin(func(w http.ResponseWriter, r *http.Request) {
		path := strings.TrimPrefix(r.URL.Path, "/api/admin/users/")
		if strings.Contains(path, "/status") {
			s.adminHandler.UpdateUserStatus(w, r)
		} else if r.Method == http.MethodDelete {
			s.adminHandler.DeleteUser(w, r)
		} else {
			http.NotFound(w, r)
		}
	}))

	// Batch routes
	mux.HandleFunc("/api/batches", s.batchHandler.requireAuth(func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			s.batchHandler.ListBatches(w, r)
		case http.MethodPost:
			s.batchHandler.requireAdminOrPresenter(s.batchHandler.CreateBatch)(w, r)
		default:
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	}))
	mux.HandleFunc("/api/batches/students", s.batchHandler.requireAdminOrPresenter(s.batchHandler.GetAvailableStudents))
	mux.HandleFunc("/api/batches/", s.batchHandler.requireAuth(func(w http.ResponseWriter, r *http.Request) {
		path := strings.TrimPrefix(r.URL.Path, "/api/batches/")
		parts := strings.Split(path, "/")

		if len(parts) >= 2 && parts[1] == "students" {
			if r.Method == http.MethodPost {
				s.batchHandler.requireAdminOrPresenter(s.batchHandler.AddStudentsToBatch)(w, r)
			} else if r.Method == http.MethodDelete && len(parts) >= 3 {
				s.batchHandler.requireAdminOrPresenter(s.batchHandler.RemoveStudentFromBatch)(w, r)
			} else {
				http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			}
			return
		}

		switch r.Method {
		case http.MethodGet:
			s.batchHandler.GetBatch(w, r)
		case http.MethodDelete:
			s.batchHandler.requireAdminOrPresenter(s.batchHandler.DeleteBatch)(w, r)
		default:
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	}))

	// Schedule routes
	mux.HandleFunc("/api/schedules", s.batchHandler.requireAuth(func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			s.scheduleHandler.ListSchedules(w, r)
		case http.MethodPost:
			s.scheduleHandler.CreateSchedule(w, r)
		default:
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	}))
	mux.HandleFunc("/api/schedules/", s.batchHandler.requireAuth(func(w http.ResponseWriter, r *http.Request) {
		path := strings.TrimPrefix(r.URL.Path, "/api/schedules/")
		parts := strings.Split(path, "/")

		if len(parts) >= 2 {
			switch parts[1] {
			case "start":
				s.scheduleHandler.StartClass(w, r)
				return
			case "end":
				s.scheduleHandler.EndClass(w, r)
				return
			case "join":
				s.scheduleHandler.JoinClass(w, r)
				return
			case "cancel":
				s.scheduleHandler.CancelSchedule(w, r)
				return
			}
		}

		switch r.Method {
		case http.MethodGet:
			s.scheduleHandler.GetSchedule(w, r)
		case http.MethodPut:
			s.scheduleHandler.UpdateSchedule(w, r)
		case http.MethodDelete:
			s.scheduleHandler.DeleteSchedule(w, r)
		default:
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	}))

	// Recording routes
	mux.HandleFunc("/api/recordings", s.batchHandler.requireAuth(func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			s.recordingHandler.ListRecordings(w, r)
		case http.MethodPost:
			s.recordingHandler.Upload(w, r)
		default:
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	}))
	mux.HandleFunc("/api/recordings/", s.batchHandler.requireAuth(func(w http.ResponseWriter, r *http.Request) {
		path := strings.TrimPrefix(r.URL.Path, "/api/recordings/")
		parts := strings.Split(path, "/")

		if len(parts) >= 2 && parts[1] == "stream" {
			s.recordingHandler.StreamRecording(w, r)
			return
		}

		switch r.Method {
		case http.MethodGet:
			s.recordingHandler.GetRecording(w, r)
		case http.MethodDelete:
			s.recordingHandler.DeleteRecording(w, r)
		default:
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	}))

	// Notes routes
	mux.HandleFunc("/api/notes", s.batchHandler.requireAuth(func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			s.noteHandler.ListNotes(w, r)
		case http.MethodPost:
			s.noteHandler.Upload(w, r)
		default:
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	}))
	mux.HandleFunc("/api/notes/", s.batchHandler.requireAuth(func(w http.ResponseWriter, r *http.Request) {
		path := strings.TrimPrefix(r.URL.Path, "/api/notes/")
		parts := strings.Split(path, "/")

		if len(parts) >= 2 && parts[1] == "download" {
			s.noteHandler.Download(w, r)
			return
		}

		switch r.Method {
		case http.MethodPut:
			s.noteHandler.Update(w, r)
		case http.MethodDelete:
			s.noteHandler.Delete(w, r)
		default:
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	}))

	// Health check endpoint (liveness probe for K8s)
	mux.HandleFunc("/api/health", func(w http.ResponseWriter, r *http.Request) {
		sendJSON(w, map[string]string{"status": "healthy"}, http.StatusOK)
	})

	// Readiness check endpoint (readiness probe for K8s)
	mux.HandleFunc("/api/ready", func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
		defer cancel()

		// Check MongoDB
		if err := s.db.HealthCheck(ctx); err != nil {
			sendJSON(w, map[string]interface{}{
				"status": "not_ready",
				"error":  "database unhealthy",
			}, http.StatusServiceUnavailable)
			return
		}

		// Check Redis if enabled
		if s.pubsub != nil {
			if err := s.pubsub.HealthCheck(ctx); err != nil {
				sendJSON(w, map[string]interface{}{
					"status": "not_ready",
					"error":  "redis unhealthy",
				}, http.StatusServiceUnavailable)
				return
			}
		}

		sendJSON(w, map[string]interface{}{
			"status":     "ready",
			"instanceId": s.config.InstanceID,
		}, http.StatusOK)
	})

	// WebSocket route
	mux.Handle("/ws", handler)

	// Static files (SPA fallback)
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		path := r.URL.Path
		if path == "/" {
			path = "/index.html"
		}

		f, err := s.staticFS.Open(strings.TrimPrefix(path, "/"))
		if err == nil {
			f.Close()
			// Set cache headers for static assets
			if strings.HasPrefix(path, "/assets/") {
				w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
			}
			http.FileServer(http.FS(s.staticFS)).ServeHTTP(w, r)
			return
		}

		if !strings.HasPrefix(path, "/api/") && !strings.HasPrefix(path, "/ws") {
			r.URL.Path = "/"
			http.FileServer(http.FS(s.staticFS)).ServeHTTP(w, r)
			return
		}

		http.NotFound(w, r)
	})

	// Build middleware chain
	var finalHandler http.Handler = mux

	// Apply middleware in order (last added = first executed)
	middlewares := []func(http.Handler) http.Handler{
		middleware.CORS([]string{"*"}),
		middleware.Recovery,
	}

	// Add compression if enabled
	if s.config.EnableCompression {
		middlewares = append(middlewares, middleware.Gzip)
	}

	// Add request timeout
	middlewares = append(middlewares, middleware.Timeout(s.config.RequestTimeout))

	// Apply middleware chain
	finalHandler = middleware.Chain(middlewares...)(mux)

	// Create optimized HTTP server
	s.httpServer = &http.Server{
		Addr:         s.config.Address(),
		Handler:      finalHandler,
		ReadTimeout:  s.config.ReadTimeout,
		WriteTimeout: s.config.WriteTimeout,
		IdleTimeout:  s.config.IdleTimeout,
		// Optimize for high concurrency
		MaxHeaderBytes: 1 << 20, // 1MB
	}

	addr := s.config.Address()
	log.Printf("🚀 LiveClass server starting on http://localhost%s", addr)
	log.Printf("📺 Open in browser to start or join a class")
	log.Printf("⚡ Performance optimizations: Compression=%v, Timeout=%v", s.config.EnableCompression, s.config.RequestTimeout)
	if s.pubsub != nil {
		log.Printf("🔄 Multi-instance mode: Redis pub/sub enabled")
	}

	return s.httpServer.ListenAndServe()
}

// Shutdown gracefully shuts down the server.
func (s *Server) Shutdown(ctx context.Context) error {
	log.Println("🔄 Shutting down HTTP server...")
	if s.httpServer != nil {
		if err := s.httpServer.Shutdown(ctx); err != nil {
			log.Printf("⚠️ HTTP server shutdown error: %v", err)
		}
	}

	log.Println("🔄 Closing database connections...")
	if s.db != nil {
		if err := s.db.Close(); err != nil {
			log.Printf("⚠️ Database close error: %v", err)
		}
	}

	if s.pubsub != nil {
		log.Println("🔄 Closing Redis connections...")
		if err := s.pubsub.Close(); err != nil {
			log.Printf("⚠️ Redis close error: %v", err)
		}
	}

	return nil
}

// Close closes server resources.
func (s *Server) Close() error {
	return s.Shutdown(context.Background())
}
