package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"github.com/beytullahgurpinar/pulse-test-suite/internal/crypto"
	"github.com/beytullahgurpinar/pulse-test-suite/internal/models"
	"github.com/beytullahgurpinar/pulse-test-suite/internal/runner"
	"github.com/beytullahgurpinar/pulse-test-suite/internal/services"

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

func (h *Handler) getWorkspaceID(c *gin.Context) uint {
	wsID, _ := c.Get("workspaceID")
	if id, ok := wsID.(uint); ok {
		return id
	}
	return 0
}

func (h *Handler) hasProject(c *gin.Context, projectID uint) bool {
	wsID := h.getWorkspaceID(c)
	var count int64
	h.DB.Model(&models.Project{}).Where("id = ? AND workspace_id = ?", projectID, wsID).Count(&count)
	return count > 0
}

// --- Projects ---
func (h *Handler) ListProjects(c *gin.Context) {
	wsID := h.getWorkspaceID(c)
	var list []models.Project
	if err := h.DB.Where("workspace_id = ?", wsID).Find(&list).Error; err != nil {
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
	wsID := h.getWorkspaceID(c)
	p := models.Project{Name: req.Name, WorkspaceID: wsID}
	if err := h.DB.Create(&p).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, p)
}

func (h *Handler) UpdateProject(c *gin.Context) {
	wsID := h.getWorkspaceID(c)
	var p models.Project
	if err := h.DB.Where("id = ? AND workspace_id = ?", c.Param("id"), wsID).First(&p).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Project not found"})
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
	wsID := h.getWorkspaceID(c)

	// Check ownership before delete
	var count int64
	h.DB.Model(&models.Project{}).Where("id = ? AND workspace_id = ?", id, wsID).Count(&count)
	if count == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Project not found"})
		return
	}

	err := h.DB.Transaction(func(tx *gorm.DB) error {
		tx.Where("project_id = ?", id).Delete(&models.Environment{})
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
		return tx.Where("id = ? AND workspace_id = ?", id, wsID).Delete(&models.Project{}).Error
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "deleted"})
}

// --- Env Vars ---
func (h *Handler) ListEnvVars(c *gin.Context) {
	projectIDStr := c.Query("projectId")
	if projectIDStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "projectId required"})
		return
	}
	pid, _ := strconv.Atoi(projectIDStr)
	if !h.hasProject(c, uint(pid)) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
		return
	}

	var list []models.EnvVar
	q := h.DB.Where("project_id = ?", pid)
	if envIDStr := c.Query("environmentId"); envIDStr != "" {
		envID, _ := strconv.Atoi(envIDStr)
		q = q.Where("environment_id = ?", envID)
	}
	if err := q.Find(&list).Error; err != nil {
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
	if !h.hasProject(c, ev.ProjectID) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
		return
	}
	if ev.Secured {
		ev.Value = "secret:****"
	}
	c.JSON(http.StatusOK, ev)
}

func (h *Handler) CreateEnvVar(c *gin.Context) {
	var req struct {
		ProjectID     uint   `json:"projectId"`
		EnvironmentID uint   `json:"environmentId"`
		Name          string `json:"name"`
		Value         string `json:"value"`
		Secured       bool   `json:"secured"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}
	if !h.hasProject(c, req.ProjectID) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
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
	ev := models.EnvVar{ProjectID: req.ProjectID, EnvironmentID: req.EnvironmentID, Name: req.Name, Value: value, Secured: req.Secured}
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
	if !h.hasProject(c, ev.ProjectID) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
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
	var ev models.EnvVar
	if err := h.DB.First(&ev, c.Param("id")).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}
	if !h.hasProject(c, ev.ProjectID) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
		return
	}
	h.DB.Delete(&ev)
	c.JSON(http.StatusOK, gin.H{"status": "deleted"})
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

	if !h.hasProject(c, req.ProjectID) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
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
	projectIDStr := c.Query("projectId")
	wsID := h.getWorkspaceID(c)

	var list []models.TestRequest
	q := h.DB.Preload("Assertions")

	if projectIDStr != "" {
		pid, _ := strconv.Atoi(projectIDStr)
		if !h.hasProject(c, uint(pid)) {
			c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
			return
		}
		q = q.Where("project_id = ?", pid)
	} else {
		// Only from accessible projects
		q = q.Joins("JOIN projects ON projects.id = test_requests.project_id").Where("projects.workspace_id = ?", wsID)
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
	if !h.hasProject(c, req.ProjectID) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
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

	if !h.hasProject(c, req.ProjectID) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
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
	if body.ProjectID > 0 && !h.hasProject(c, body.ProjectID) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Forbidden project move"})
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
	var req models.TestRequest
	if err := h.DB.First(&req, c.Param("id")).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}
	if !h.hasProject(c, req.ProjectID) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
		return
	}
	err := h.DB.Transaction(func(tx *gorm.DB) error {
		tx.Where("test_request_id = ?", req.ID).Delete(&models.Assertion{})
		tx.Where("test_request_id = ?", req.ID).Delete(&models.TestRun{})
		return tx.Delete(&req).Error
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "deleted"})
}

// DuplicateTestRequest - Testi kopyala
func (h *Handler) DuplicateTestRequest(c *gin.Context) {
	var source models.TestRequest
	if err := h.DB.Preload("Assertions").First(&source, c.Param("id")).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}
	if !h.hasProject(c, source.ProjectID) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
		return
	}

	dup := models.TestRequest{
		ProjectID:  source.ProjectID,
		CategoryID: source.CategoryID,
		Name:       "Kopya: " + source.Name,
		Method:     source.Method,
		URL:        source.URL,
		Headers:    source.Headers,
		Body:       source.Body,
	}
	if err := h.DB.Create(&dup).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	for _, a := range source.Assertions {
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
	var body struct {
		EnvironmentID *uint `json:"environmentId"`
	}
	_ = c.ShouldBindJSON(&body) // optional body

	var testReq models.TestRequest
	if err := h.DB.Preload("Assertions").First(&testReq, c.Param("id")).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}
	if !h.hasProject(c, testReq.ProjectID) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
		return
	}

	testRun, err := h.execution.ExecuteAndSaveTest(&testReq, nil, body.EnvironmentID)
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
	projectIDStr := c.Query("projectId")
	wsID := h.getWorkspaceID(c)

	var envID *uint
	if envIDStr := c.Query("environmentId"); envIDStr != "" {
		id, _ := strconv.Atoi(envIDStr)
		envIDVal := uint(id)
		envID = &envIDVal
	}

	var list []models.TestRequest
	q := h.DB.Preload("Assertions")

	if projectIDStr != "" {
		pid, _ := strconv.Atoi(projectIDStr)
		if !h.hasProject(c, uint(pid)) {
			c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
			return
		}
		q = q.Where("project_id = ?", pid)
	} else {
		q = q.Joins("JOIN projects ON projects.id = test_requests.project_id").Where("projects.workspace_id = ?", wsID)
	}

	if err := q.Find(&list).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	results := []gin.H{}
	for _, req := range list {
		testRun, _ := h.execution.ExecuteAndSaveTest(&req, nil, envID)

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

// ListTestRuns - Test çalıştırma geçmişi (paginated)
func (h *Handler) ListTestRuns(c *gin.Context) {
	testID := c.Query("testId")
	projectIDStr := c.Query("projectId")
	testRequestIDStr := c.Query("testRequestId")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "0"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	wsID := h.getWorkspaceID(c)
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}
	offset := (page - 1) * limit

	var runs []models.TestRun
	q := h.DB.Model(&models.TestRun{}).Order("created_at DESC")
	q = q.Where("workspace_id = ?", wsID)

	if testID != "" { // This is likely testRequestID, but keeping original variable name
		q = q.Where("test_request_id = ?", testID)
	}
	if testRequestIDStr != "" {
		q = q.Where("test_request_id = ?", testRequestIDStr)
	}
	if projectIDStr != "" {
		pid, _ := strconv.Atoi(projectIDStr)
		if !h.hasProject(c, uint(pid)) {
			c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
			return
		}
		q = q.Joins("JOIN test_requests ON test_requests.id = test_runs.test_request_id").Where("test_requests.project_id = ?", pid)
	}

	var total int64
	q.Count(&total)

	if err := q.Limit(limit).Offset(offset).Find(&runs).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Enrich runs with test names
	testIDs := make(map[uint]bool)
	for _, r := range runs {
		testIDs[r.TestRequestID] = true
	}
	nameMap := make(map[uint]string)
	if len(testIDs) > 0 {
		ids := make([]uint, 0, len(testIDs))
		for id := range testIDs {
			ids = append(ids, id)
		}
		var tests []models.TestRequest
		h.DB.Select("id, name").Where("id IN ?", ids).Find(&tests)
		for _, t := range tests {
			nameMap[t.ID] = t.Name
		}
	}

	type RunWithName struct {
		models.TestRun
		TestName string `json:"testName"`
	}
	enriched := make([]RunWithName, len(runs))
	for i, r := range runs {
		enriched[i] = RunWithName{TestRun: r, TestName: nameMap[r.TestRequestID]}
	}

	c.JSON(http.StatusOK, gin.H{
		"data":  enriched,
		"total": total,
		"page":  page,
		"limit": limit,
	})
}

// GetTestRun - Single run detail (for modal)
func (h *Handler) GetTestRun(c *gin.Context) {
	var tr models.TestRun
	if err := h.DB.First(&tr, c.Param("id")).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}
	wsID := h.getWorkspaceID(c)
	if tr.WorkspaceID != wsID {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
		return
	}
	// Rest of the logic to return run details...
	var ar []runner.AssertionResult
	if tr.AssertionResults != "" {
		_ = json.Unmarshal([]byte(tr.AssertionResults), &ar)
	}
	if ar == nil {
		ar = []runner.AssertionResult{}
	}
	resp := gin.H{
		"passed":           tr.Status == "passed" || tr.Status == "success",
		"statusCode":       tr.StatusCode,
		"responseBody":     tr.ResponseBody,
		"durationMs":       tr.DurationMs,
		"assertionResults": ar,
		"error":            tr.ErrorMessage,
		"runId":            tr.ID,
		"createdAt":        tr.CreatedAt,
	}
	if tr.RequestMethod != "" || tr.RequestURL != "" {
		var headers map[string]string
		if tr.RequestHeaders != "" {
			_ = json.Unmarshal([]byte(tr.RequestHeaders), &headers)
		}
		resp["request"] = gin.H{
			"method":  tr.RequestMethod,
			"url":     tr.RequestURL,
			"headers": headers,
			"body":    tr.RequestBody,
		}
	}
	c.JSON(http.StatusOK, resp)
}

// --- Dashboard ---
func (h *Handler) GetDashboard(c *gin.Context) {
	wsID := h.getWorkspaceID(c)

	// Overall stats
	var totalTests int64
	h.DB.Model(&models.TestRequest{}).Joins("JOIN projects ON projects.id = test_requests.project_id").Where("projects.workspace_id = ?", wsID).Count(&totalTests)

	var totalRuns int64
	h.DB.Model(&models.TestRun{}).Where("workspace_id = ?", wsID).Count(&totalRuns)

	var passedRuns int64
	h.DB.Model(&models.TestRun{}).Where("workspace_id = ? AND status IN ?", wsID, []string{"passed", "success"}).Count(&passedRuns)

	var failedRuns int64
	h.DB.Model(&models.TestRun{}).Where("workspace_id = ? AND status = ?", wsID, "failed").Count(&failedRuns)

	// Average duration
	var avgDuration float64
	h.DB.Model(&models.TestRun{}).Where("workspace_id = ?", wsID).Select("COALESCE(AVG(duration_ms), 0)").Row().Scan(&avgDuration)

	// Recent runs (last 20)
	var recentRuns []struct {
		models.TestRun
		TestName string `json:"testName"`
	}
	h.DB.Table("test_runs").
		Select("test_runs.*, test_requests.name as test_name").
		Joins("LEFT JOIN test_requests ON test_runs.test_request_id = test_requests.id").
		Where("test_runs.workspace_id = ?", wsID).
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
	h.DB.Where("workspace_id = ?", wsID).Find(&projects)
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
	projectIDStr := c.Query("projectId")
	wsID := h.getWorkspaceID(c)

	var list []models.Schedule
	q := h.DB.Order("created_at DESC")

	if projectIDStr != "" {
		pid, _ := strconv.Atoi(projectIDStr)
		if !h.hasProject(c, uint(pid)) {
			c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
			return
		}
		q = q.Where("project_id = ?", pid)
	} else {
		q = q.Joins("JOIN projects ON projects.id = schedules.project_id").Where("projects.workspace_id = ?", wsID)
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
	if !h.hasProject(c, req.ProjectID) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
		return
	}
	if req.IntervalMins < 1 {
		req.IntervalMins = 60
	}
	// Set next run to now + interval
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
	if !h.hasProject(c, schedule.ProjectID) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
		return
	}
	var body models.Schedule
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if body.ProjectID > 0 && !h.hasProject(c, body.ProjectID) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Forbidden project move"})
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
	var schedule models.Schedule
	if err := h.DB.First(&schedule, c.Param("id")).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}
	if !h.hasProject(c, schedule.ProjectID) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
		return
	}
	h.DB.Delete(&schedule)
	c.JSON(http.StatusOK, gin.H{"message": "deleted"})
}

func (h *Handler) ToggleSchedule(c *gin.Context) {
	var schedule models.Schedule
	if err := h.DB.First(&schedule, c.Param("id")).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}
	if !h.hasProject(c, schedule.ProjectID) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
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
