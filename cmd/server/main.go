package main

import (
	"io/fs"
	"log"
	"net/http"
	"path"
	"strings"

	"github.com/beytullahgurpinar/pulse-test-suite/internal/config"
	"github.com/beytullahgurpinar/pulse-test-suite/internal/database"
	"github.com/beytullahgurpinar/pulse-test-suite/internal/handlers"
	"github.com/beytullahgurpinar/pulse-test-suite/internal/scheduler"
	"github.com/beytullahgurpinar/pulse-test-suite/internal/static"

	"github.com/gin-gonic/gin"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatal(err)
	}

	db, err := database.Connect(cfg)
	if err != nil {
		log.Fatal("Database:", err)
	}

	h := handlers.New(db, cfg.EncryptionKey)
	auth := handlers.NewAuthHandler(db, cfg)
	users := handlers.NewUserHandler(db)

	// Start the scheduler
	sched := scheduler.New(db, cfg.EncryptionKey)
	sched.Start()
	defer sched.Stop()

	r := gin.New()
	r.Use(gin.Logger(), gin.Recovery())

	// Security headers
	r.Use(func(c *gin.Context) {
		c.Header("X-Content-Type-Options", "nosniff")
		c.Header("X-Frame-Options", "DENY")
		c.Header("X-XSS-Protection", "1; mode=block")
		c.Header("Referrer-Policy", "strict-origin-when-cross-origin")
		c.Next()
	})

	// API
	apiGroup := r.Group("/api")
	{
		// Auth - No middleware
		apiGroup.GET("/auth/google/login", auth.GoogleLogin)
		apiGroup.GET("/auth/google/callback", auth.GoogleCallback)

		// Protected API
		protected := apiGroup.Group("")
		protected.Use(handlers.AuthMiddleware(cfg.JWTSecret))
		{
			protected.GET("/auth/me", auth.GetMe)
			protected.POST("/auth/me/last-project", auth.UpdateLastProject)

			// Projects management - Admin only
			projects := protected.Group("/projects")
			projects.Use(handlers.AdminOnly())
			{
				projects.POST("", h.CreateProject)
				projects.PUT("/:id", h.UpdateProject)
				projects.DELETE("/:id", h.DeleteProject)
			}
			// Projects list - All roles
			protected.GET("/projects", h.ListProjects)

			protected.GET("/env-vars", h.ListEnvVars)
			protected.GET("/env-vars/:id", h.GetEnvVar)
			protected.POST("/env-vars", h.CreateEnvVar)
			protected.PUT("/env-vars/:id", h.UpdateEnvVar)
			protected.DELETE("/env-vars/:id", h.DeleteEnvVar)

			protected.GET("/tests", h.ListTestRequests)
			protected.POST("/tests", h.CreateTestRequest)
			protected.GET("/tests/:id", h.GetTestRequest)
			protected.PUT("/tests/:id", h.UpdateTestRequest)
			protected.DELETE("/tests/:id", h.DeleteTestRequest)
			protected.POST("/tests/:id/duplicate", h.DuplicateTestRequest)
			protected.POST("/tests/:id/run", h.RunTest)
			protected.POST("/tests/run-all", h.RunAllTests)
			protected.GET("/runs/:id", h.GetTestRun)
			protected.GET("/runs", h.ListTestRuns)

			// Categories
			protected.GET("/categories", h.ListCategories)
			protected.POST("/categories", h.CreateCategory)
			protected.PUT("/categories/:id", h.UpdateCategory)
			protected.DELETE("/categories/:id", h.DeleteCategory)

			// Flows
			protected.GET("/flows", h.ListFlows)
			protected.GET("/flows/runs", h.ListFlowRuns)
			protected.GET("/flows/runs/:id", h.GetFlowRun)
			protected.GET("/flows/:id", h.GetFlow)
			protected.POST("/flows", h.CreateFlow)
			protected.PUT("/flows/:id", h.UpdateFlow)
			protected.DELETE("/flows/:id", h.DeleteFlow)
			protected.POST("/flows/:id/run", h.RunFlow)

			// User management - Admin only
			userGroup := protected.Group("/users")
			userGroup.Use(handlers.AdminOnly())
			{
				userGroup.GET("", users.ListUsers)
				userGroup.PUT("/:id", users.UpdateUser)
				userGroup.DELETE("/:id", users.DeleteUser)
			}

			// Invitations - Admin only
			invGroup := protected.Group("/invitations")
			invGroup.Use(handlers.AdminOnly())
			{
				invGroup.GET("", users.ListInvitations)
				invGroup.POST("", users.CreateInvitation)
				invGroup.DELETE("/:id", users.DeleteInvitation)
			}

			// Dashboard
			protected.GET("/dashboard", h.GetDashboard)

			// Schedules
			protected.GET("/schedules", h.ListSchedules)
			protected.POST("/schedules", h.CreateSchedule)
			protected.PUT("/schedules/:id", h.UpdateSchedule)
			protected.DELETE("/schedules/:id", h.DeleteSchedule)
			protected.POST("/schedules/:id/toggle", h.ToggleSchedule)
		}
	}

	// Static frontend - serve directly with c.Data (no redirects)
	webFS, _ := fs.Sub(static.WebFS, "web")
	r.NoRoute(func(c *gin.Context) {
		filePath := strings.TrimPrefix(c.Request.URL.Path, "/")
		if filePath == "" {
			filePath = "index.html"
		}
		filePath = path.Clean(filePath)
		if strings.HasPrefix(filePath, "..") {
			c.String(http.StatusBadRequest, "invalid path")
			return
		}

		data, err := fs.ReadFile(webFS, filePath)
		servedIndex := false
		if err != nil {
			// Never fall back to index.html for asset requests - returns HTML with wrong MIME type
			ext := path.Ext(filePath)
			isAsset := strings.HasPrefix(filePath, "assets/") ||
				ext == ".js" || ext == ".mjs" || ext == ".css" || ext == ".ico" ||
				ext == ".svg" || ext == ".woff2" || ext == ".woff" || ext == ".ttf" || ext == ".map"
			if isAsset {
				c.String(http.StatusNotFound, "not found")
				return
			}
			data, _ = fs.ReadFile(webFS, "index.html")
			servedIndex = true
		}
		if data == nil {
			c.String(http.StatusNotFound, "not found")
			return
		}

		ctype := "application/octet-stream"
		if servedIndex {
			ctype = "text/html; charset=utf-8"
		} else {
			switch path.Ext(filePath) {
			case ".html":
				ctype = "text/html; charset=utf-8"
			case ".js":
				ctype = "application/javascript"
			case ".css":
				ctype = "text/css"
			case ".ico":
				ctype = "image/x-icon"
			case ".json":
				ctype = "application/json"
			}
		}

		c.Data(http.StatusOK, ctype, data)
	})

	log.Printf("Server starting on :%s", cfg.Port)
	r.Run(":" + cfg.Port)
}
