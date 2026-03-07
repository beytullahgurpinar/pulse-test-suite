package handlers

import (
	"net/http"
	"strconv"

	"github.com/beytullahgurpinar/pulse-test-suite/internal/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// --- Flows ---

func (h *Handler) ListFlows(c *gin.Context) {
	projectIDStr := c.Query("projectId")
	wsID := h.getWorkspaceID(c)

	var list []models.Flow
	q := h.DB.Preload("Steps").Order("created_at DESC")

	if projectIDStr != "" {
		pid, _ := strconv.Atoi(projectIDStr)
		if !h.hasProject(c, uint(pid)) {
			c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
			return
		}
		q = q.Where("project_id = ?", pid)
	} else {
		q = q.Joins("JOIN projects ON projects.id = flows.project_id").Where("projects.workspace_id = ?", wsID)
	}

	if err := q.Find(&list).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, list)
}

func (h *Handler) GetFlow(c *gin.Context) {
	var flow models.Flow
	if err := h.DB.Preload("Steps").First(&flow, c.Param("id")).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}
	if !h.hasProject(c, flow.ProjectID) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
		return
	}
	c.JSON(http.StatusOK, flow)
}

func (h *Handler) CreateFlow(c *gin.Context) {
	var req struct {
		ProjectID uint              `json:"projectId"`
		Name      string            `json:"name"`
		Steps     []models.FlowStep `json:"steps"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if !h.hasProject(c, req.ProjectID) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
		return
	}

	flow := models.Flow{
		ProjectID: req.ProjectID,
		Name:      req.Name,
		Steps:     req.Steps,
	}

	if err := h.DB.Create(&flow).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, flow)
}

func (h *Handler) UpdateFlow(c *gin.Context) {
	var flow models.Flow
	if err := h.DB.First(&flow, c.Param("id")).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}
	if !h.hasProject(c, flow.ProjectID) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
		return
	}
	var body struct {
		Name  string            `json:"name"`
		Steps []models.FlowStep `json:"steps"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	err := h.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("flow_id = ?", flow.ID).Delete(&models.FlowStep{}).Error; err != nil {
			return err
		}
		flow.Name = body.Name
		if err := tx.Save(&flow).Error; err != nil {
			return err
		}
		for i := range body.Steps {
			body.Steps[i].FlowID = flow.ID
		}
		if len(body.Steps) > 0 {
			if err := tx.Create(&body.Steps).Error; err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	h.DB.Preload("Steps").First(&flow, flow.ID)
	c.JSON(http.StatusOK, flow)
}

func (h *Handler) DeleteFlow(c *gin.Context) {
	var flow models.Flow
	if err := h.DB.First(&flow, c.Param("id")).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}
	if !h.hasProject(c, flow.ProjectID) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
		return
	}
	err := h.DB.Transaction(func(tx *gorm.DB) error {
		tx.Where("flow_id = ?", flow.ID).Delete(&models.FlowStep{})
		tx.Where("flow_id = ?", flow.ID).Delete(&models.FlowRun{})
		return tx.Delete(&flow).Error
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "deleted"})
}

func (h *Handler) RunFlow(c *gin.Context) {
	var body struct {
		EnvironmentID *uint `json:"environmentId"`
	}
	_ = c.ShouldBindJSON(&body) // optional body

	id, _ := strconv.Atoi(c.Param("id"))
	// Check access
	var flow models.Flow
	if err := h.DB.First(&flow, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}
	if !h.hasProject(c, flow.ProjectID) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
		return
	}
	run, err := h.execution.ExecuteAndSaveFlow(uint(id), nil, body.EnvironmentID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	h.DB.Preload("Steps.TestRun").First(run, run.ID)
	c.JSON(http.StatusOK, run)
}

func (h *Handler) ListFlowRuns(c *gin.Context) {
	flowID := c.Query("flowId")
	projectIDStr := c.Query("projectId")
	wsID := h.getWorkspaceID(c)

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}
	offset := (page - 1) * limit

	var runs []models.FlowRun
	q := h.DB.Model(&models.FlowRun{}).Order("created_at DESC")
	q = q.Where("workspace_id = ?", wsID)

	if flowID != "" {
		q = q.Where("flow_id = ?", flowID)
	}
	if projectIDStr != "" {
		pid, _ := strconv.Atoi(projectIDStr)
		if !h.hasProject(c, uint(pid)) {
			c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
			return
		}
		q = q.Joins("JOIN flows ON flows.id = flow_runs.flow_id").Where("flows.project_id = ?", pid)
	}

	var total int64
	q.Count(&total)

	if err := q.Limit(limit).Offset(offset).Find(&runs).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":  runs,
		"total": total,
		"page":  page,
		"limit": limit,
	})
}

func (h *Handler) GetFlowRun(c *gin.Context) {
	var run models.FlowRun
	if err := h.DB.Preload("Steps.TestRun").First(&run, c.Param("id")).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}
	wsID := h.getWorkspaceID(c)
	if run.WorkspaceID != wsID {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
		return
	}
	c.JSON(http.StatusOK, run)
}
