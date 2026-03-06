package main

import (
	"io/fs"
	"log"
	"net/http"
	"path"
	"strings"

	"zotlotestsuite/internal/config"
	"zotlotestsuite/internal/database"
	"zotlotestsuite/internal/handlers"
	"zotlotestsuite/internal/scheduler"
	"zotlotestsuite/internal/static"

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

	// Start the scheduler
	sched := scheduler.New(db, cfg.EncryptionKey)
	sched.Start()
	defer sched.Stop()

	r := gin.New()
	r.Use(gin.Logger(), gin.Recovery())

	// API
	api := r.Group("/api")
	{
		api.GET("/projects", h.ListProjects)
		api.POST("/projects", h.CreateProject)
		api.PUT("/projects/:id", h.UpdateProject)
		api.DELETE("/projects/:id", h.DeleteProject)

		api.GET("/env-vars", h.ListEnvVars)
		api.GET("/env-vars/:id", h.GetEnvVar)
		api.POST("/env-vars", h.CreateEnvVar)
		api.PUT("/env-vars/:id", h.UpdateEnvVar)
		api.DELETE("/env-vars/:id", h.DeleteEnvVar)

		api.GET("/tests", h.ListTestRequests)
		api.POST("/tests", h.CreateTestRequest)
		api.GET("/tests/:id", h.GetTestRequest)
		api.PUT("/tests/:id", h.UpdateTestRequest)
		api.DELETE("/tests/:id", h.DeleteTestRequest)
		api.POST("/tests/:id/duplicate", h.DuplicateTestRequest)
		api.POST("/tests/:id/run", h.RunTest)
		api.POST("/tests/run-all", h.RunAllTests)
		api.GET("/runs/:id", h.GetTestRun)
		api.GET("/runs", h.ListTestRuns)

		// Categories
		api.GET("/categories", h.ListCategories)
		api.POST("/categories", h.CreateCategory)
		api.PUT("/categories/:id", h.UpdateCategory)
		api.DELETE("/categories/:id", h.DeleteCategory)

		// Flows
		api.GET("/flows", h.ListFlows)
		api.GET("/flows/runs", h.ListFlowRuns)
		api.GET("/flows/runs/:id", h.GetFlowRun)
		api.GET("/flows/:id", h.GetFlow)
		api.POST("/flows", h.CreateFlow)
		api.PUT("/flows/:id", h.UpdateFlow)
		api.DELETE("/flows/:id", h.DeleteFlow)
		api.POST("/flows/:id/run", h.RunFlow)

		// Dashboard
		api.GET("/dashboard", h.GetDashboard)

		// Schedules
		api.GET("/schedules", h.ListSchedules)
		api.POST("/schedules", h.CreateSchedule)
		api.PUT("/schedules/:id", h.UpdateSchedule)
		api.DELETE("/schedules/:id", h.DeleteSchedule)
		api.POST("/schedules/:id/toggle", h.ToggleSchedule)
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
