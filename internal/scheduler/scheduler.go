package scheduler

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"sync"
	"time"

	"zotlotestsuite/internal/models"
	"zotlotestsuite/internal/services"

	"gorm.io/gorm"
)

// Scheduler manages periodic test execution
type Scheduler struct {
	db        *gorm.DB
	execution *services.ExecutionService
	mu        sync.Mutex
	stop      chan struct{}
}

// New creates a new Scheduler
func New(db *gorm.DB, encryptionKey string) *Scheduler {
	return &Scheduler{
		db:        db,
		execution: services.NewExecutionService(db, encryptionKey),
		stop:      make(chan struct{}),
	}
}

// Start begins the scheduler loop - checks every 30 seconds for due schedules
func (s *Scheduler) Start() {
	go func() {
		// Initial run after 5 seconds to let the server start
		time.Sleep(5 * time.Second)
		s.tick()

		ticker := time.NewTicker(30 * time.Second)
		defer ticker.Stop()

		for {
			select {
			case <-ticker.C:
				s.tick()
			case <-s.stop:
				return
			}
		}
	}()
	log.Println("Scheduler started (checking every 30s)")
}

// Stop stops the scheduler
func (s *Scheduler) Stop() {
	close(s.stop)
}

func (s *Scheduler) tick() {
	s.mu.Lock()
	defer s.mu.Unlock()

	now := time.Now()
	var schedules []models.Schedule
	s.db.Where("enabled = ? AND (next_run_at IS NULL OR next_run_at <= ?)", true, now).Find(&schedules)

	for _, schedule := range schedules {
		s.runSchedule(&schedule, now)
	}
}

func (s *Scheduler) runSchedule(schedule *models.Schedule, now time.Time) {
	log.Printf("Scheduler: Running schedule '%s' (ID: %d)", schedule.Name, schedule.ID)

	var failedTests []string
	var totalTests, passedTests int

	if schedule.RunAllTests {
		// Run all tests in the project
		var tests []models.TestRequest
		s.db.Preload("Assertions").Where("project_id = ?", schedule.ProjectID).Find(&tests)

		for _, test := range tests {
			totalTests++
			run, err := s.execution.ExecuteAndSaveTest(&test, &schedule.ID)
			if err == nil && run.Status == "passed" {
				passedTests++
			} else {
				failedTests = append(failedTests, test.Name)
			}
		}
	} else if schedule.FlowID != nil {
		// Run specific flow
		var flow models.Flow
		if err := s.db.First(&flow, *schedule.FlowID).Error; err == nil {
			totalTests++
			run, err := s.execution.ExecuteAndSaveFlow(flow.ID, &schedule.ID)
			if err == nil && run.Status == "passed" {
				passedTests++
			} else {
				failedTests = append(failedTests, flow.Name)
			}
		}
	} else if schedule.TestRequestID != nil {
		// Run specific test
		var test models.TestRequest
		if err := s.db.Preload("Assertions").First(&test, *schedule.TestRequestID).Error; err == nil {
			totalTests++
			run, err := s.execution.ExecuteAndSaveTest(&test, &schedule.ID)
			if err == nil && run.Status == "passed" {
				passedTests++
			} else {
				failedTests = append(failedTests, test.Name)
			}
		}
	}

	// Update schedule timing
	nextRun := now.Add(time.Duration(schedule.IntervalMins) * time.Minute)
	s.db.Model(schedule).Updates(map[string]interface{}{
		"last_run_at": now,
		"next_run_at": nextRun,
	})

	// Send webhook notification
	shouldNotify := false
	if schedule.WebhookURL != "" {
		if len(failedTests) > 0 && schedule.NotifyOnFail {
			shouldNotify = true
		} else if len(failedTests) == 0 && schedule.NotifyOnSuccess {
			shouldNotify = true
		}
	}

	if shouldNotify {
		go s.sendWebhook(schedule, totalTests, passedTests, failedTests)
	}

	log.Printf("Scheduler: Schedule '%s' completed - %d/%d passed", schedule.Name, passedTests, totalTests)
}

func (s *Scheduler) sendWebhook(schedule *models.Schedule, total, passed int, failedTests []string) {
	// Load project name
	var project models.Project
	s.db.First(&project, schedule.ProjectID)

	msg := fmt.Sprintf("✅ Schedule '%s' completed successfully - %d/%d tests passed (project: %s)", schedule.Name, passed, total, project.Name)
	if len(failedTests) > 0 {
		msg = fmt.Sprintf("⚠️ %d/%d tests failed in schedule '%s' (project: %s)", len(failedTests), total, schedule.Name, project.Name)
	}

	payload := map[string]interface{}{
		"event":       "schedule_completed",
		"schedule":    schedule.Name,
		"project":     project.Name,
		"totalTests":  total,
		"passedTests": passed,
		"failedTests": failedTests,
		"timestamp":   time.Now().UTC().Format(time.RFC3339),
		"message":     msg,
		"text":        msg, // Compatibility for Slack
	}

	body, _ := json.Marshal(payload)
	req, err := http.NewRequest("POST", schedule.WebhookURL, bytes.NewBuffer(body))
	if err != nil {
		log.Printf("Scheduler: webhook error for schedule %d: %s", schedule.ID, err)
		return
	}
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		log.Printf("Scheduler: webhook failed for schedule %d: %s", schedule.ID, err)
		return
	}
	defer resp.Body.Close()
	log.Printf("Scheduler: webhook sent for schedule %d, response: %d", schedule.ID, resp.StatusCode)
}
