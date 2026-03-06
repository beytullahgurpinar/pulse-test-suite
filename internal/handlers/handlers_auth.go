package handlers

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"net/http"
	"net/url"

	"github.com/beytullahgurpinar/pulse-test-suite/internal/config"
	"github.com/beytullahgurpinar/pulse-test-suite/internal/crypto"
	"github.com/beytullahgurpinar/pulse-test-suite/internal/models"
	"github.com/gin-gonic/gin"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
	googleoauth2 "google.golang.org/api/oauth2/v2"
	"google.golang.org/api/option"
	"gorm.io/gorm"
)

type AuthHandler struct {
	db     *gorm.DB
	cfg    *config.Config
	oauth2 *oauth2.Config
}

func NewAuthHandler(db *gorm.DB, cfg *config.Config) *AuthHandler {
	redirectURL := cfg.GoogleRedirectURL
	if redirectURL == "" {
		redirectURL = fmt.Sprintf("%s/api/auth/google/callback", cfg.AppURL)
	}

	return &AuthHandler{
		db:  db,
		cfg: cfg,
		oauth2: &oauth2.Config{
			ClientID:     cfg.GoogleClientID,
			ClientSecret: cfg.GoogleClientSecret,
			RedirectURL:  redirectURL,
			Scopes: []string{
				"https://www.googleapis.com/auth/userinfo.email",
				"https://www.googleapis.com/auth/userinfo.profile",
			},
			Endpoint: google.Endpoint,
		},
	}
}

func generateState() string {
	b := make([]byte, 16)
	rand.Read(b)
	return hex.EncodeToString(b)
}

func (h *AuthHandler) GoogleLogin(c *gin.Context) {
	state := generateState()
	// Store state in a short-lived httpOnly cookie to validate on callback (CSRF protection)
	c.SetCookie("oauth_state", state, 600, "/", "", false, true)
	authURL := h.oauth2.AuthCodeURL(state, oauth2.AccessTypeOffline)
	c.Redirect(http.StatusTemporaryRedirect, authURL)
}

func (h *AuthHandler) GoogleCallback(c *gin.Context) {
	// Validate OAuth state to prevent CSRF
	state := c.Query("state")
	cookieState, err := c.Cookie("oauth_state")
	if err != nil || state == "" || state != cookieState {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid OAuth state"})
		return
	}
	c.SetCookie("oauth_state", "", -1, "/", "", false, true) // clear

	code := c.Query("code")
	if code == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Code missing"})
		return
	}

	token, err := h.oauth2.Exchange(context.Background(), code)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Token exchange failed"})
		return
	}

	oauth2Service, err := googleoauth2.NewService(context.Background(), option.WithTokenSource(h.oauth2.TokenSource(context.Background(), token)))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "OAuth service failed"})
		return
	}

	userInfo, err := oauth2Service.Userinfo.Get().Do()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get user info"})
		return
	}

	// 1. Find or create user
	var user models.User
	err = h.db.Where("google_id = ?", userInfo.Id).First(&user).Error
	if err != nil {
		// New user — check for a pending invitation by EMAIL first
		var workspaceID uint
		role := "admin"

		var inv models.Invitation
		if h.db.Where("email = ? AND used = false", userInfo.Email).First(&inv).Error == nil {
			workspaceID = inv.WorkspaceID
			role = inv.Role
			h.db.Model(&inv).Update("used", true)
		}

		// Fallback: check invite_token cookie (legacy link-based flow)
		if workspaceID == 0 {
			inviteToken, _ := c.Cookie("invite_token")
			c.SetCookie("invite_token", "", -1, "/", "", false, true)
			if inviteToken != "" {
				var inv2 models.Invitation
				if h.db.Where("token = ? AND used = false", inviteToken).First(&inv2).Error == nil {
					workspaceID = inv2.WorkspaceID
					role = inv2.Role
					h.db.Model(&inv2).Update("used", true)
				}
			}
		}

		if workspaceID == 0 {
			// No invitation — create own workspace
			ws := models.Workspace{Name: fmt.Sprintf("%s's Workspace", userInfo.Name)}
			if err := h.db.Create(&ws).Error; err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create workspace"})
				return
			}
			workspaceID = ws.ID
		}

		user = models.User{
			GoogleID:    userInfo.Id,
			Email:       userInfo.Email,
			Name:        userInfo.Name,
			Avatar:      userInfo.Picture,
			WorkspaceID: workspaceID,
			Role:        role,
		}
		if err := h.db.Create(&user).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user"})
			return
		}
	} else {
		// Existing user - sync name/avatar only
		user.Name = userInfo.Name
		user.Avatar = userInfo.Picture
		h.db.Save(&user)
	}

	if user.Role == "" {
		user.Role = "editor"
	}

	// 2. Generate JWT
	jwtToken, err := crypto.GenerateToken(user.ID, user.WorkspaceID, user.Email, user.Role, h.cfg.JWTSecret)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	// 3. Redirect to frontend with token
	c.Redirect(http.StatusTemporaryRedirect, fmt.Sprintf("/auth/success?token=%s", url.QueryEscape(jwtToken)))
}

func (h *AuthHandler) UpdateLastProject(c *gin.Context) {
	userIDVal, _ := c.Get("userID")
	workspaceIDVal, _ := c.Get("workspaceID")
	userID := userIDVal.(uint)
	workspaceID := workspaceIDVal.(uint)

	var req struct {
		ProjectID uint `json:"projectId" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "projectId is required"})
		return
	}

	// Ensure the project belongs to the user's workspace
	var count int64
	h.db.Model(&models.Project{}).
		Where("id = ? AND workspace_id = ?", req.ProjectID, workspaceID).
		Count(&count)
	if count == 0 {
		c.JSON(http.StatusForbidden, gin.H{"error": "Project not found in your workspace"})
		return
	}

	if err := h.db.Model(&models.User{}).
		Where("id = ?", userID).
		Update("last_project_id", req.ProjectID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update last project"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "ok"})
}

func (h *AuthHandler) GetMe(c *gin.Context) {
	userIDVal, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Not authenticated"})
		return
	}

	userID := userIDVal.(uint)
	var user models.User
	if err := h.db.Preload("Workspace").First(&user, userID).Error; err != nil {
		// Return 401 so the frontend's global auth handler clears the stale token
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User session invalid"})
		return
	}
	c.JSON(http.StatusOK, user)
}
