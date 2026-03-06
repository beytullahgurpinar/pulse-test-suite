package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	"zotlotestsuite/internal/crypto"
	"zotlotestsuite/internal/models"
	"zotlotestsuite/internal/runner"
	"zotlotestsuite/internal/services"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type Handler struct {
	DB            *gorm.DB
	EncryptionKey []byte
	execution     *services.ExecutionService
}

func New(db *gorm.DB, encryptionKey string) *Handler {
	return &Handler{
		DB:            db,
		EncryptionKey: crypto.DeriveKey(encryptionKey),
		execution:     services.NewExecutionService(db, encryptionKey),
	}
}

// --- Projects ---
func (h *Handler) ListProjects(c *gin.Context) {
	var list []models.Project
	if err := h.DB.Find(&list).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, list)
}

func (h *Handler) CreateProject(c *gin.Context) {
	var req struct {
		Name string `json:"name"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	p := models.Project{Name: req.Name}
	if err := h.DB.Create(&p).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, p)
}

func (h *Handler) UpdateProject(c *gin.Context) {
	var p models.Project
	if err := h.DB.First(&p, c.Param("id")).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}
	var body struct {
		Name string `json:"name"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	p.Name = body.Name
	h.DB.Save(&p)
	c.JSON(http.StatusOK, p)
}

func (h *Handler) DeleteProject(c *gin.Context) {
	id := c.Param("id")
	err := h.DB.Transaction(func(tx *gorm.DB) error {
		tx.Where("project_id = ?", id).Delete(&models.EnvVar{})
		// Delete schedules for project
		tx.Where("project_id = ?", id).Delete(&models.Schedule{})
		var tests []models.TestRequest
		tx.Where("project_id = ?", id).Find(&tests)
		for _, t := range tests {
			tx.Where("test_request_id = ?", t.ID).Delete(&models.Assertion{})
			tx.Where("test_request_id = ?", t.ID).Delete(&models.TestRun{})
		}
		tx.Where("project_id = ?", id).Delete(&models.TestRequest{})
		return tx.Delete(&models.Project{}, id).Error
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "deleted"})
}

// --- Env Vars ---
func (h *Handler) ListEnvVars(c *gin.Context) {
	projectID := c.Query("projectId")
	if projectID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "projectId required"})
		return
	}
	var list []models.EnvVar
	if err := h.DB.Where("project_id = ?", projectID).Find(&list).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	for i := range list {
		if list[i].Secured && list[i].Value != "" {
			dec, err := crypto.Decrypt(list[i].Value, h.EncryptionKey)
			if err == nil {
				list[i].Value = crypto.MaskSecuredValue(dec)
			} else {
				list[i].Value = "secret:****"
			}
		}
	}
	c.JSON(http.StatusOK, list)
}

func (h *Handler) GetEnvVar(c *gin.Context) {
	var ev models.EnvVar
	if err := h.DB.First(&ev, c.Param("id")).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}
	if ev.Secured && ev.Value != "" {
		dec, err := crypto.Decrypt(ev.Value, h.EncryptionKey)
		if err == nil {
			ev.Value = dec
		}
	}
	c.JSON(http.StatusOK, ev)
}

func (h *Handler) CreateEnvVar(c *gin.Context) {
	var req struct {
		ProjectID uint   `json:"projectId"`
		Name      string `json:"name"`
		Value     string `json:"value"`
		Secured   bool   `json:"secured"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	value := req.Value
	if req.Secured && value != "" {
		enc, err := crypto.Encrypt(value, h.EncryptionKey)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "encryption failed"})
			return
		}
		value = enc
	}
	ev := models.EnvVar{ProjectID: req.ProjectID, Name: req.Name, Value: value, Secured: req.Secured}
	if err := h.DB.Create(&ev).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if ev.Secured {
		ev.Value = crypto.MaskSecuredValue(req.Value)
	} else {
		ev.Value = req.Value
	}
	c.JSON(http.StatusCreated, ev)
}

func (h *Handler) UpdateEnvVar(c *gin.Context) {
	var ev models.EnvVar
	if err := h.DB.First(&ev, c.Param("id")).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}
	var body struct {
		Name    string `json:"name"`
		Value   string `json:"value"`
		Secured *bool  `json:"secured"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	ev.Name = body.Name
	wasSecured := ev.Secured
	if body.Secured != nil {
		ev.Secured = *body.Secured
	}
	if ev.Secured && body.Value != "" {
		enc, err := crypto.Encrypt(body.Value, h.EncryptionKey)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "encryption failed"})
			return
		}
		ev.Value = enc
	} else if !ev.Secured {
		if body.Value != "" {
			ev.Value = body.Value
		} else if wasSecured {
			dec, err := crypto.Decrypt(ev.Value, h.EncryptionKey)
			if err == nil {
				ev.Value = dec
			}
		}
	}
	h.DB.Save(&ev)
	out := ev
	if ev.Secured {
		if body.Value != "" {
			out.Value = crypto.MaskSecuredValue(body.Value)
		} else {
			out.Value = "secret:****"
		}
	} else {
		out.Value = body.Value
	}
	c.JSON(http.StatusOK, out)
}

func (h *Handler) DeleteEnvVar(c *gin.Context) {
	if err := h.DB.Delete(&models.EnvVar{}, c.Param("id")).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "deleted"})
}

// --- Tests ---
// CreateTestRequest - Yeni test isteği oluştur
func (h *Handler) CreateTestRequest(c *gin.Context) {
	var req struct {
		ProjectID  uint               `json:"projectId"`
		CategoryID *uint              `json:"categoryId"`
		Name       string             `json:"name"`
		Method     string             `json:"method"`
		URL        string             `json:"url"`
		Headers    models.JSONMap     `json:"headers"`
		Body       string             `json:"body"`
		Assertions []models.Assertion `json:"assertions"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	testReq := models.TestRequest{
		ProjectID:  req.ProjectID,
		CategoryID: req.CategoryID,
		Name:       req.Name,
		Method:     req.Method,
		URL:        req.URL,
		Headers:    req.Headers,
		Body:       req.Body,
	}

	if err := h.DB.Create(&testReq).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	for i := range req.Assertions {
		req.Assertions[i].TestRequestID = testReq.ID
	}
	if len(req.Assertions) > 0 {
		h.DB.Create(&req.Assertions)
	}

	c.JSON(http.StatusCreated, testReq)
}

// ListTestRequests - Test isteklerini listele (projectId ile filtre)
func (h *Handler) ListTestRequests(c *gin.Context) {
	projectID := c.Query("projectId")
	var list []models.TestRequest
	q := h.DB.Preload("Assertions")
	if projectID != "" {
		q = q.Where("project_id = ?", projectID)
	}
	if err := q.Find(&list).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, list)
}

// GetTestRequest - Tek test isteği getir
func (h *Handler) GetTestRequest(c *gin.Context) {
	var req models.TestRequest
	if err := h.DB.Preload("Assertions").First(&req, c.Param("id")).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}
	c.JSON(http.StatusOK, req)
}

// UpdateTestRequest - Test isteğini güncelle
func (h *Handler) UpdateTestRequest(c *gin.Context) {
	var req models.TestRequest
	if err := h.DB.First(&req, c.Param("id")).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}

	var body struct {
		ProjectID  uint               `json:"projectId"`
		CategoryID *uint              `json:"categoryId"`
		Name       string             `json:"name"`
		Method     string             `json:"method"`
		URL        string             `json:"url"`
		Headers    models.JSONMap     `json:"headers"`
		Body       string             `json:"body"`
		Assertions []models.Assertion `json:"assertions"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	err := h.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("test_request_id = ?", req.ID).Delete(&models.Assertion{}).Error; err != nil {
			return err
		}
		if body.ProjectID > 0 {
			req.ProjectID = body.ProjectID
		}
		req.CategoryID = body.CategoryID
		req.Name = body.Name
		req.Method = body.Method
		req.URL = body.URL
		req.Headers = body.Headers
		req.Body = body.Body
		if err := tx.Save(&req).Error; err != nil {
			return err
		}
		for i := range body.Assertions {
			body.Assertions[i].TestRequestID = req.ID
		}
		if len(body.Assertions) > 0 {
			if err := tx.Create(&body.Assertions).Error; err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, req)
}

// DeleteTestRequest - Test isteğini sil (önce child kayıtları sil)
func (h *Handler) DeleteTestRequest(c *gin.Context) {
	id := c.Param("id")
	err := h.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("test_request_id = ?", id).Delete(&models.Assertion{}).Error; err != nil {
			return err
		}
		if err := tx.Where("test_request_id = ?", id).Delete(&models.TestRun{}).Error; err != nil {
			return err
		}
		if err := tx.Delete(&models.TestRequest{}, id).Error; err != nil {
			return err
		}
		return nil
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "deleted"})
}

// DuplicateTestRequest - Testi kopyala
func (h *Handler) DuplicateTestRequest(c *gin.Context) {
	var orig models.TestRequest
	if err := h.DB.Preload("Assertions").First(&orig, c.Param("id")).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}

	dup := models.TestRequest{
		ProjectID:  orig.ProjectID,
		CategoryID: orig.CategoryID,
		Name:       "Kopya: " + orig.Name,
		Method:     orig.Method,
		URL:        orig.URL,
		Headers:    orig.Headers,
		Body:       orig.Body,
	}
	if err := h.DB.Create(&dup).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	for _, a := range orig.Assertions {
		newA := models.Assertion{
			TestRequestID: dup.ID,
			Type:          a.Type,
			Key:           a.Key,
			Operator:      a.Operator,
			ExpectedValue: a.ExpectedValue,
		}
		h.DB.Create(&newA)
	}

	c.JSON(http.StatusCreated, dup)
}

// RunTest - Tek test çalıştır
func (h *Handler) RunTest(c *gin.Context) {
	var req models.TestRequest
	if err := h.DB.Preload("Assertions").First(&req, c.Param("id")).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}

	testRun, err := h.execution.ExecuteAndSaveTest(&req, nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	var ar []runner.AssertionResult
	if testRun.AssertionResults != "" {
		_ = json.Unmarshal([]byte(testRun.AssertionResults), &ar)
	}

	var headers map[string]string
	if testRun.RequestHeaders != "" {
		_ = json.Unmarshal([]byte(testRun.RequestHeaders), &headers)
	}

	resp := gin.H{
		"passed":           testRun.Status == "passed",
		"statusCode":       testRun.StatusCode,
		"responseBody":     testRun.ResponseBody,
		"durationMs":       testRun.DurationMs,
		"assertionResults": ar,
		"error":            testRun.ErrorMessage,
		"runId":            testRun.ID,
	}
	if testRun.RequestMethod != "" || testRun.RequestURL != "" {
		resp["request"] = gin.H{
			"method":  testRun.RequestMethod,
			"url":     testRun.RequestURL,
			"headers": headers,
			"body":    testRun.RequestBody,
		}
	}
	c.JSON(http.StatusOK, resp)
}

// RunAllTests - Tüm testleri çalıştır (projectId ile filtre)
func (h *Handler) RunAllTests(c *gin.Context) {
	projectID := c.Query("projectId")
	var list []models.TestRequest
	q := h.DB.Preload("Assertions")
	if projectID != "" {
		q = q.Where("project_id = ?", projectID)
	}
	if err := q.Find(&list).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	results := []gin.H{}
	for _, req := range list {
		testRun, _ := h.execution.ExecuteAndSaveTest(&req, nil)

		var ar []runner.AssertionResult
		if testRun.AssertionResults != "" {
			_ = json.Unmarshal([]byte(testRun.AssertionResults), &ar)
		}

		results = append(results, gin.H{
			"testId":           req.ID,
			"testName":         req.Name,
			"passed":           testRun.Status == "passed",
			"statusCode":       testRun.StatusCode,
			"responseBody":     testRun.ResponseBody,
			"durationMs":       testRun.DurationMs,
			"assertionResults": ar,
			"error":            testRun.ErrorMessage,
			"runId":            testRun.ID,
		})
	}

	c.JSON(http.StatusOK, gin.H{"results": results})
}

// ListTestRuns - Test çalıştırma geçmişi
func (h *Handler) ListTestRuns(c *gin.Context) {
	testID := c.Query("testId")
	var runs []models.TestRun
	q := h.DB.Order("created_at DESC").Limit(100)
	if testID != "" {
		q = q.Where("test_request_id = ?", testID)
	}
	if err := q.Find(&runs).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, runs)
}

// GetTestRun - Single run detail (for modal)
func (h *Handler) GetTestRun(c *gin.Context) {
	var run models.TestRun
	if err := h.DB.First(&run, c.Param("id")).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}
	var ar []runner.AssertionResult
	if run.AssertionResults != "" {
		_ = json.Unmarshal([]byte(run.AssertionResults), &ar)
	}
	if ar == nil {
		ar = []runner.AssertionResult{}
	}
	resp := gin.H{
		"passed":           run.Status == "passed",
		"statusCode":       run.StatusCode,
		"responseBody":     run.ResponseBody,
		"durationMs":       run.DurationMs,
		"assertionResults": ar,
		"error":            run.ErrorMessage,
		"runId":            run.ID,
		"createdAt":        run.CreatedAt,
	}
	if run.RequestMethod != "" || run.RequestURL != "" {
		var headers map[string]string
		if run.RequestHeaders != "" {
			_ = json.Unmarshal([]byte(run.RequestHeaders), &headers)
		}
		resp["request"] = gin.H{
			"method":  run.RequestMethod,
			"url":     run.RequestURL,
			"headers": headers,
			"body":    run.RequestBody,
		}
	}
	c.JSON(http.StatusOK, resp)
}

// --- Dashboard ---
func (h *Handler) GetDashboard(c *gin.Context) {
	// Overall stats
	var totalTests int64
	h.DB.Model(&models.TestRequest{}).Count(&totalTests)

	var totalRuns int64
	h.DB.Model(&models.TestRun{}).Count(&totalRuns)

	var passedRuns int64
	h.DB.Model(&models.TestRun{}).Where("status = ?", "passed").Count(&passedRuns)

	var failedRuns int64
	h.DB.Model(&models.TestRun{}).Where("status = ?", "failed").Count(&failedRuns)

	// Average duration
	var avgDuration float64
	h.DB.Model(&models.TestRun{}).Select("COALESCE(AVG(duration_ms), 0)").Row().Scan(&avgDuration)

	// Recent runs (last 20)
	var recentRuns []struct {
		models.TestRun
		TestName string `json:"testName"`
	}
	h.DB.Table("test_runs").
		Select("test_runs.*, test_requests.name as test_name").
		Joins("LEFT JOIN test_requests ON test_runs.test_request_id = test_requests.id").
		Order("test_runs.created_at DESC").
		Limit(20).
		Find(&recentRuns)

	recentRunsJSON := make([]gin.H, 0, len(recentRuns))
	for _, r := range recentRuns {
		recentRunsJSON = append(recentRunsJSON, gin.H{
			"id":         r.ID,
			"testName":   r.TestName,
			"status":     r.Status,
			"statusCode": r.StatusCode,
			"durationMs": r.DurationMs,
			"createdAt":  r.CreatedAt,
			"scheduleId": r.ScheduleID,
		})
	}

	// Per-project stats
	type projectStat struct {
		ProjectID   uint    `json:"projectId"`
		ProjectName string  `json:"projectName"`
		TestCount   int64   `json:"testCount"`
		RunCount    int64   `json:"runCount"`
		PassCount   int64   `json:"passCount"`
		FailCount   int64   `json:"failCount"`
		AvgDuration float64 `json:"avgDuration"`
	}

	var projects []models.Project
	h.DB.Find(&projects)
	projectStats := make([]projectStat, 0, len(projects))
	for _, p := range projects {
		var stat projectStat
		stat.ProjectID = p.ID
		stat.ProjectName = p.Name

		h.DB.Model(&models.TestRequest{}).Where("project_id = ?", p.ID).Count(&stat.TestCount)

		// Get runs for this project's tests
		h.DB.Model(&models.TestRun{}).
			Joins("JOIN test_requests ON test_runs.test_request_id = test_requests.id").
			Where("test_requests.project_id = ?", p.ID).
			Count(&stat.RunCount)

		h.DB.Model(&models.TestRun{}).
			Joins("JOIN test_requests ON test_runs.test_request_id = test_requests.id").
			Where("test_requests.project_id = ? AND test_runs.status = ?", p.ID, "passed").
			Count(&stat.PassCount)

		h.DB.Model(&models.TestRun{}).
			Joins("JOIN test_requests ON test_runs.test_request_id = test_requests.id").
			Where("test_requests.project_id = ? AND test_runs.status = ?", p.ID, "failed").
			Count(&stat.FailCount)

		h.DB.Model(&models.TestRun{}).
			Select("COALESCE(AVG(test_runs.duration_ms), 0)").
			Joins("JOIN test_requests ON test_runs.test_request_id = test_requests.id").
			Where("test_requests.project_id = ?", p.ID).
			Row().Scan(&stat.AvgDuration)

		projectStats = append(projectStats, stat)
	}

	// Active schedules count
	var activeSchedules int64
	h.DB.Model(&models.Schedule{}).Where("enabled = ?", true).Count(&activeSchedules)

	c.JSON(http.StatusOK, gin.H{
		"totalTests":      totalTests,
		"totalRuns":       totalRuns,
		"passedRuns":      passedRuns,
		"failedRuns":      failedRuns,
		"avgDuration":     avgDuration,
		"successRate":     calculateRate(passedRuns, totalRuns),
		"recentRuns":      recentRunsJSON,
		"projectStats":    projectStats,
		"activeSchedules": activeSchedules,
	})
}

func calculateRate(passed, total int64) float64 {
	if total == 0 {
		return 0
	}
	return float64(passed) / float64(total) * 100
}

// --- Schedules ---
func (h *Handler) ListSchedules(c *gin.Context) {
	projectID := c.Query("projectId")
	var list []models.Schedule
	q := h.DB.Order("created_at DESC")
	if projectID != "" {
		q = q.Where("project_id = ?", projectID)
	}
	if err := q.Find(&list).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, list)
}

func (h *Handler) CreateSchedule(c *gin.Context) {
	var req models.Schedule
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if req.IntervalMins < 1 {
		req.IntervalMins = 60
	}
	// Set next run to now + interval
	nextRun := models.Schedule{}
	_ = nextRun // avoid unused
	now := func() *time.Time { t := time.Now().Add(time.Duration(req.IntervalMins) * time.Minute); return &t }()
	req.NextRunAt = now

	if err := h.DB.Create(&req).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, req)
}

func (h *Handler) UpdateSchedule(c *gin.Context) {
	var schedule models.Schedule
	if err := h.DB.First(&schedule, c.Param("id")).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}
	var body models.Schedule
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	schedule.Name = body.Name
	schedule.IntervalMins = body.IntervalMins
	schedule.Enabled = body.Enabled
	schedule.RunAllTests = body.RunAllTests
	schedule.TestRequestID = body.TestRequestID
	schedule.FlowID = body.FlowID
	schedule.WebhookURL = body.WebhookURL
	schedule.NotifyOnFail = body.NotifyOnFail
	schedule.NotifyOnSuccess = body.NotifyOnSuccess
	if body.IntervalMins < 1 {
		schedule.IntervalMins = 60
	}
	// Recalculate next run
	nextRun := time.Now().Add(time.Duration(schedule.IntervalMins) * time.Minute)
	schedule.NextRunAt = &nextRun

	h.DB.Save(&schedule)
	c.JSON(http.StatusOK, schedule)
}

func (h *Handler) DeleteSchedule(c *gin.Context) {
	if err := h.DB.Delete(&models.Schedule{}, c.Param("id")).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "deleted"})
}

func (h *Handler) ToggleSchedule(c *gin.Context) {
	var schedule models.Schedule
	if err := h.DB.First(&schedule, c.Param("id")).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}
	schedule.Enabled = !schedule.Enabled
	if schedule.Enabled {
		nextRun := time.Now().Add(time.Duration(schedule.IntervalMins) * time.Minute)
		schedule.NextRunAt = &nextRun
	}
	h.DB.Save(&schedule)
	c.JSON(http.StatusOK, schedule)
}
