package handlers

import (
	"fmt"
	"net/http"
	"strconv"

	"github.com/beytullahgurpinar/pulse-test-suite/internal/models"
	"github.com/gin-gonic/gin"
)

// ListEnvironments returns all environments for a project
func (h *Handler) ListEnvironments(c *gin.Context) {
	pidStr := c.Query("projectId")
	if pidStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "projectId required"})
		return
	}
	pid, _ := strconv.Atoi(pidStr)
	if !h.hasProject(c, uint(pid)) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
		return
	}

	envs := []models.Environment{}
	h.DB.Where("project_id = ?", pid).Order("is_default DESC, name ASC").Find(&envs)
	c.JSON(http.StatusOK, envs)
}

// CreateEnvironment creates a new environment for a project
func (h *Handler) CreateEnvironment(c *gin.Context) {
	var req struct {
		ProjectID uint   `json:"projectId"`
		Name      string `json:"name"`
	}
	if err := c.ShouldBindJSON(&req); err != nil || req.Name == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "projectId and name required"})
		return
	}
	if !h.hasProject(c, req.ProjectID) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
		return
	}

	// Check unique name per project
	var count int64
	h.DB.Model(&models.Environment{}).Where("project_id = ? AND name = ?", req.ProjectID, req.Name).Count(&count)
	if count > 0 {
		c.JSON(http.StatusConflict, gin.H{"error": "Environment name already exists"})
		return
	}

	env := models.Environment{
		ProjectID: req.ProjectID,
		Name:      req.Name,
		IsDefault: false,
	}
	if err := h.DB.Create(&env).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create environment"})
		return
	}
	c.JSON(http.StatusOK, env)
}

// UpdateEnvironment updates an environment's name and/or default status
func (h *Handler) UpdateEnvironment(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	var env models.Environment
	if err := h.DB.First(&env, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}
	if !h.hasProject(c, env.ProjectID) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
		return
	}

	var req struct {
		Name      *string `json:"name"`
		IsDefault *bool   `json:"isDefault"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	if req.Name != nil && *req.Name != "" {
		// Check unique name
		var count int64
		h.DB.Model(&models.Environment{}).Where("project_id = ? AND name = ? AND id != ?", env.ProjectID, *req.Name, env.ID).Count(&count)
		if count > 0 {
			c.JSON(http.StatusConflict, gin.H{"error": "Environment name already exists"})
			return
		}
		env.Name = *req.Name
	}

	if req.IsDefault != nil && *req.IsDefault {
		// Unset old default, set new one in transaction
		tx := h.DB.Begin()
		tx.Model(&models.Environment{}).Where("project_id = ? AND is_default = ?", env.ProjectID, true).Update("is_default", false)
		env.IsDefault = true
		if err := tx.Save(&env).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update"})
			return
		}
		tx.Commit()
	} else {
		h.DB.Save(&env)
	}

	c.JSON(http.StatusOK, env)
}

// DeleteEnvironment deletes an environment and its env vars
func (h *Handler) DeleteEnvironment(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	var env models.Environment
	if err := h.DB.First(&env, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}
	if !h.hasProject(c, env.ProjectID) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
		return
	}
	if env.IsDefault {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot delete the default environment. Set another as default first."})
		return
	}

	tx := h.DB.Begin()
	// Delete env vars belonging to this environment
	tx.Where("environment_id = ?", env.ID).Delete(&models.EnvVar{})
	tx.Delete(&env)
	tx.Commit()

	c.JSON(http.StatusOK, gin.H{"message": "deleted"})
}

// DuplicateEnvironment copies an environment and all its env vars
func (h *Handler) DuplicateEnvironment(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	var src models.Environment
	if err := h.DB.First(&src, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}
	if !h.hasProject(c, src.ProjectID) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
		return
	}

	// Find a unique name: "Name (Copy)", "Name (Copy 2)", etc.
	baseName := fmt.Sprintf("%s (Copy)", src.Name)
	newName := baseName
	for i := 2; ; i++ {
		var count int64
		h.DB.Model(&models.Environment{}).Where("project_id = ? AND name = ?", src.ProjectID, newName).Count(&count)
		if count == 0 {
			break
		}
		newName = fmt.Sprintf("%s (Copy %d)", src.Name, i)
	}

	tx := h.DB.Begin()

	dst := models.Environment{
		ProjectID: src.ProjectID,
		Name:      newName,
		IsDefault: false,
	}
	if err := tx.Create(&dst).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to duplicate environment"})
		return
	}

	// Copy all env vars
	var srcVars []models.EnvVar
	tx.Where("environment_id = ?", src.ID).Find(&srcVars)
	for _, v := range srcVars {
		newVar := models.EnvVar{
			ProjectID:     v.ProjectID,
			EnvironmentID: dst.ID,
			Name:          v.Name,
			Value:         v.Value,
			Secured:       v.Secured,
		}
		if err := tx.Create(&newVar).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to copy env vars"})
			return
		}
	}

	tx.Commit()
	c.JSON(http.StatusOK, dst)
}
