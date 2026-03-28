package handlers

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"net/http"

	"github.com/beytullahgurpinar/pulse-test-suite/internal/models"
	"github.com/gin-gonic/gin"
)

// generateMCPKey creates a new key in format "zts_<40 hex chars>"
func generateMCPKey() (fullKey, prefix, hash string, err error) {
	b := make([]byte, 20)
	if _, err = rand.Read(b); err != nil {
		return
	}
	fullKey = "zts_" + hex.EncodeToString(b)
	prefix = fullKey[:12] // "zts_" + first 8 hex chars
	sum := sha256.Sum256([]byte(fullKey))
	hash = hex.EncodeToString(sum[:])
	return
}

// HashMCPKey returns the SHA-256 hex of a key string (used by MCP server binary)
func HashMCPKey(key string) string {
	sum := sha256.Sum256([]byte(key))
	return hex.EncodeToString(sum[:])
}

// ListMcpKeys - list all MCP keys for a project
func (h *Handler) ListMcpKeys(c *gin.Context) {
	projectIDStr := c.Query("projectId")
	if projectIDStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "projectId required"})
		return
	}
	var pid uint
	fmt.Sscan(projectIDStr, &pid)
	if !h.hasProject(c, pid) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
		return
	}

	var keys []models.MCPKey
	if err := h.DB.Where("project_id = ?", pid).Order("created_at DESC").Find(&keys).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, keys)
}

// CreateMcpKey - create a new MCP key; returns full key ONE TIME in response
func (h *Handler) CreateMcpKey(c *gin.Context) {
	var req struct {
		ProjectID     uint   `json:"projectId"`
		EnvironmentID *uint  `json:"environmentId"`
		Name          string `json:"name"`
	}
	if err := c.ShouldBindJSON(&req); err != nil || req.Name == "" || req.ProjectID == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "name and projectId required"})
		return
	}
	if !h.hasProject(c, req.ProjectID) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
		return
	}

	fullKey, prefix, hash, err := generateMCPKey()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate key"})
		return
	}

	key := models.MCPKey{
		ProjectID:     req.ProjectID,
		EnvironmentID: req.EnvironmentID,
		Name:          req.Name,
		KeyPrefix:     prefix,
		KeyHash:       hash,
	}
	if err := h.DB.Create(&key).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"id":            key.ID,
		"projectId":     key.ProjectID,
		"environmentId": key.EnvironmentID,
		"name":          key.Name,
		"keyPrefix":     key.KeyPrefix,
		"createdAt":     key.CreatedAt,
		"key":           fullKey, // shown only once on creation
	})
}

// RotateMcpKey - regenerate key; old key is immediately invalid
func (h *Handler) RotateMcpKey(c *gin.Context) {
	var key models.MCPKey
	if err := h.DB.First(&key, c.Param("id")).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "key not found"})
		return
	}
	if !h.hasProject(c, key.ProjectID) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
		return
	}

	fullKey, prefix, hash, err := generateMCPKey()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate key"})
		return
	}

	key.KeyPrefix = prefix
	key.KeyHash = hash
	key.LastUsedAt = nil
	h.DB.Save(&key)

	c.JSON(http.StatusOK, gin.H{
		"id":            key.ID,
		"projectId":     key.ProjectID,
		"environmentId": key.EnvironmentID,
		"name":          key.Name,
		"keyPrefix":     key.KeyPrefix,
		"updatedAt":     key.UpdatedAt,
		"key":           fullKey, // shown only once on rotation
	})
}

// DeleteMcpKey - delete an MCP key
func (h *Handler) DeleteMcpKey(c *gin.Context) {
	var key models.MCPKey
	if err := h.DB.First(&key, c.Param("id")).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "key not found"})
		return
	}
	if !h.hasProject(c, key.ProjectID) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
		return
	}
	h.DB.Delete(&key)
	c.JSON(http.StatusOK, gin.H{"message": "deleted"})
}
