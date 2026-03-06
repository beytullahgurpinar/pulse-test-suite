package handlers

import (
	"net/http"
	"dreamworks/internal/models"

	"github.com/gin-gonic/gin"
)

// --- Categories ---

func (h *Handler) ListCategories(c *gin.Context) {
	projectID := c.Query("projectId")
	if projectID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "projectId required"})
		return
	}
	var list []models.Category
	if err := h.DB.Where("project_id = ?", projectID).Find(&list).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, list)
}

func (h *Handler) CreateCategory(c *gin.Context) {
	var req struct {
		ProjectID uint   `json:"projectId"`
		ParentID  *uint  `json:"parentId"`
		Name      string `json:"name"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	cat := models.Category{
		ProjectID: req.ProjectID,
		ParentID:  req.ParentID,
		Name:      req.Name,
	}
	if err := h.DB.Create(&cat).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, cat)
}

func (h *Handler) UpdateCategory(c *gin.Context) {
	var cat models.Category
	if err := h.DB.First(&cat, c.Param("id")).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}
	var body struct {
		Name     string `json:"name"`
		ParentID *uint  `json:"parentId"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	cat.Name = body.Name
	cat.ParentID = body.ParentID
	h.DB.Save(&cat)
	c.JSON(http.StatusOK, cat)
}

func (h *Handler) DeleteCategory(c *gin.Context) {
	id := c.Param("id")
	h.DB.Model(&models.TestRequest{}).Where("category_id = ?", id).Update("category_id", nil)
	h.DB.Where("parent_id = ?", id).Delete(&models.Category{})
	if err := h.DB.Delete(&models.Category{}, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "deleted"})
}
