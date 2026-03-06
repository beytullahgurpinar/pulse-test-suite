package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"net/http"

	"github.com/beytullahgurpinar/pulse-test-suite/internal/models"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type UserHandler struct {
	db *gorm.DB
}

func NewUserHandler(db *gorm.DB) *UserHandler {
	return &UserHandler{db: db}
}

// GET /api/users - list all users in the workspace
func (h *UserHandler) ListUsers(c *gin.Context) {
	workspaceID := c.MustGet("workspaceID").(uint)
	callerID := c.MustGet("userID").(uint)

	var users []models.User
	h.db.Where("workspace_id = ?", workspaceID).Find(&users)

	// Mark which one is the caller so frontend can disable self-delete
	type UserResponse struct {
		models.User
		IsSelf bool `json:"isSelf"`
	}
	resp := make([]UserResponse, len(users))
	for i, u := range users {
		resp[i] = UserResponse{User: u, IsSelf: u.ID == callerID}
	}
	c.JSON(http.StatusOK, resp)
}

// PUT /api/users/:id - update user role
func (h *UserHandler) UpdateUser(c *gin.Context) {
	workspaceID := c.MustGet("workspaceID").(uint)
	callerID := c.MustGet("userID").(uint)

	var target models.User
	if err := h.db.Where("id = ? AND workspace_id = ?", c.Param("id"), workspaceID).First(&target).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}
	if target.ID == callerID {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot change your own role"})
		return
	}

	var req struct {
		Role string `json:"role" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil || (req.Role != "admin" && req.Role != "editor") {
		c.JSON(http.StatusBadRequest, gin.H{"error": "role must be 'admin' or 'editor'"})
		return
	}

	// Prevent removing the last admin
	if target.Role == "admin" && req.Role != "admin" {
		var adminCount int64
		h.db.Model(&models.User{}).Where("workspace_id = ? AND role = 'admin'", workspaceID).Count(&adminCount)
		if adminCount <= 1 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot demote the last admin"})
			return
		}
	}

	h.db.Model(&target).Update("role", req.Role)
	c.JSON(http.StatusOK, target)
}

// DELETE /api/users/:id - remove user from workspace
func (h *UserHandler) DeleteUser(c *gin.Context) {
	workspaceID := c.MustGet("workspaceID").(uint)
	callerID := c.MustGet("userID").(uint)

	var target models.User
	if err := h.db.Where("id = ? AND workspace_id = ?", c.Param("id"), workspaceID).First(&target).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}
	if target.ID == callerID {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot remove yourself"})
		return
	}
	if target.Role == "admin" {
		var adminCount int64
		h.db.Model(&models.User{}).Where("workspace_id = ? AND role = 'admin'", workspaceID).Count(&adminCount)
		if adminCount <= 1 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot remove the last admin"})
			return
		}
	}

	h.db.Delete(&target)
	c.JSON(http.StatusOK, gin.H{"message": "User removed"})
}

// GET /api/invitations - list pending invitations for this workspace
func (h *UserHandler) ListInvitations(c *gin.Context) {
	workspaceID := c.MustGet("workspaceID").(uint)
	invitations := []models.Invitation{}
	h.db.Where("workspace_id = ? AND used = false", workspaceID).Order("created_at desc").Find(&invitations)
	c.JSON(http.StatusOK, invitations)
}

// POST /api/invitations - create an invitation
func (h *UserHandler) CreateInvitation(c *gin.Context) {
	workspaceID := c.MustGet("workspaceID").(uint)

	var req struct {
		Email string `json:"email" binding:"required"`
		Role  string `json:"role" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "email and role are required"})
		return
	}
	if req.Role != "admin" && req.Role != "editor" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "role must be 'admin' or 'editor'"})
		return
	}

	// Generate token
	b := make([]byte, 24)
	rand.Read(b)
	token := hex.EncodeToString(b)

	inv := models.Invitation{
		WorkspaceID: workspaceID,
		Email:       req.Email,
		Role:        req.Role,
		Token:       token,
	}
	if err := h.db.Create(&inv).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create invitation"})
		return
	}
	c.JSON(http.StatusCreated, inv)
}

// DELETE /api/invitations/:id - cancel an invitation
func (h *UserHandler) DeleteInvitation(c *gin.Context) {
	workspaceID := c.MustGet("workspaceID").(uint)
	var inv models.Invitation
	if err := h.db.Where("id = ? AND workspace_id = ?", c.Param("id"), workspaceID).First(&inv).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Invitation not found"})
		return
	}
	h.db.Delete(&inv)
	c.JSON(http.StatusOK, gin.H{"message": "Invitation cancelled"})
}
