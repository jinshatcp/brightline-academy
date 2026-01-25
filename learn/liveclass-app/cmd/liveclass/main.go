// Package main is the entry point for the LiveClass application.
// LiveClass is a real-time video streaming platform for online classes.
package main

import (
	"context"
	"embed"
	"log"
	"os"
	"os/signal"
	"syscall"

	"github.com/jinshatcp/brightline-academy/learn/internal/config"
	"github.com/jinshatcp/brightline-academy/learn/internal/server"
)

//go:embed dist/*
var staticFiles embed.FS

// main initializes and runs the LiveClass server with graceful shutdown.
func main() {
	cfg := config.Default()

	log.Printf("🆔 Instance ID: %s", cfg.InstanceID)

	srv, err := server.New(cfg, staticFiles, "dist")
	if err != nil {
		log.Fatalf("Failed to create server: %v", err)
	}

	// Setup graceful shutdown
	shutdown := make(chan os.Signal, 1)
	signal.Notify(shutdown, os.Interrupt, syscall.SIGTERM)

	// Run server in goroutine
	serverErr := make(chan error, 1)
	go func() {
		serverErr <- srv.Run()
	}()

	// Wait for shutdown signal or server error
	select {
	case err := <-serverErr:
		if err != nil {
			log.Fatalf("❌ Server error: %v", err)
		}
	case sig := <-shutdown:
		log.Printf("🛑 Received signal %v, initiating graceful shutdown...", sig)

		ctx, cancel := context.WithTimeout(context.Background(), cfg.ShutdownTimeout)
		defer cancel()

		if err := srv.Shutdown(ctx); err != nil {
			log.Printf("⚠️ Shutdown error: %v", err)
		}

		log.Println("✅ Server shutdown complete")
	}
}
