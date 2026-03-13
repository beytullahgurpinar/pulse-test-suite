package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"github.com/beytullahgurpinar/pulse-test-suite/internal/models"
	"github.com/gin-gonic/gin"
	"gopkg.in/yaml.v3"
)

// --- Postman Collection v2.0 / v2.1 structures ---

type postmanCollection struct {
	Info postmanInfo   `json:"info"`
	Item []postmanItem `json:"item"`
}

type postmanInfo struct {
	Name string `json:"name"`
}

type postmanItem struct {
	Name    string        `json:"name"`
	Item    []postmanItem `json:"item"`
	Request *postmanReq   `json:"request"`
}

type postmanReq struct {
	Method string          `json:"method"`
	Header []postmanHeader `json:"header"`
	URL    postmanURL      `json:"url"`
	Body   *postmanBody    `json:"body"`
}

type postmanHeader struct {
	Key      string `json:"key"`
	Value    string `json:"value"`
	Disabled bool   `json:"disabled"`
}

type postmanURL struct {
	Raw      string         `json:"raw"`
	Protocol string         `json:"protocol"`
	Host     []string       `json:"host"`
	Path     []string       `json:"path"`
	Query    []postmanQuery `json:"query"`
}

func (u *postmanURL) UnmarshalJSON(data []byte) error {
	// Try string form first
	var s string
	if json.Unmarshal(data, &s) == nil {
		u.Raw = s
		return nil
	}
	// Object form
	type alias postmanURL
	var obj alias
	if err := json.Unmarshal(data, &obj); err != nil {
		return err
	}
	*u = postmanURL(obj)
	return nil
}

// resolved returns Raw if non-empty, otherwise reconstructs from protocol+host+path.
func (u *postmanURL) resolved() string {
	if u.Raw != "" {
		return u.Raw
	}
	if len(u.Host) == 0 {
		return ""
	}
	scheme := u.Protocol
	if scheme == "" {
		scheme = "https"
	}
	url := scheme + "://" + strings.Join(u.Host, ".")
	if len(u.Path) > 0 {
		url += "/" + strings.Join(u.Path, "/")
	}
	return url
}

type postmanQuery struct {
	Key      string `json:"key"`
	Value    string `json:"value"`
	Disabled bool   `json:"disabled"`
}

type postmanBody struct {
	Mode string `json:"mode"`
	Raw  string `json:"raw"`
}

// --- OpenAPI 3.x / Swagger 2.x structures ---

type openAPISpec struct {
	OpenAPI string `json:"openapi" yaml:"openapi"`
	Swagger string `json:"swagger" yaml:"swagger"`
	Info    struct {
		Title string `json:"title" yaml:"title"`
	} `json:"info" yaml:"info"`
	Servers []struct {
		URL string `json:"url" yaml:"url"`
	} `json:"servers" yaml:"servers"`
	Host     string                                 `json:"host" yaml:"host"`
	BasePath string                                 `json:"basePath" yaml:"basePath"`
	Paths    map[string]map[string]openAPIOperation `json:"paths" yaml:"paths"`
}

type openAPIOperation struct {
	Summary     string          `json:"summary" yaml:"summary"`
	OperationID string          `json:"operationId" yaml:"operationId"`
	Tags        []string        `json:"tags" yaml:"tags"`
	Parameters  []openAPIParam  `json:"parameters" yaml:"parameters"`
	RequestBody *openAPIReqBody `json:"requestBody" yaml:"requestBody"`
}

type openAPIParam struct {
	Name    string      `json:"name" yaml:"name"`
	In      string      `json:"in" yaml:"in"`
	Example interface{} `json:"example" yaml:"example"`
}

type openAPIReqBody struct {
	Content map[string]openAPIMediaType `json:"content" yaml:"content"`
}

type openAPIMediaType struct {
	Schema  map[string]interface{} `json:"schema" yaml:"schema"`
	Example interface{}            `json:"example" yaml:"example"`
}

// --- Intermediate structure ---

type importedTest struct {
	Name         string         `json:"name"`
	Method       string         `json:"method"`
	URL          string         `json:"url"`
	CategoryPath []string       `json:"categoryPath"` // e.g. ["Auth", "OAuth"] for nested folders
	Headers      models.JSONMap `json:"-"`
	Body         string         `json:"body"`
}

// categoryLabel returns a human-readable display path like "Auth / OAuth".
func (it *importedTest) categoryLabel() string {
	return strings.Join(it.CategoryPath, " / ")
}

// --- Category path resolver ---
// resolveCategoryPath creates categories for a path like ["Auth", "OAuth"] top-down,
// matching by (project_id, name, parent_id) at each level. Returns the leaf category ID.
func (h *Handler) resolveCategoryPath(projectID uint, path []string) *uint {
	if len(path) == 0 {
		return nil
	}
	var parentID *uint
	for _, name := range path {
		var cat models.Category
		db := h.DB.Where("project_id = ? AND name = ?", projectID, name)
		if parentID == nil {
			db = db.Where("parent_id IS NULL")
		} else {
			db = db.Where("parent_id = ?", *parentID)
		}
		if err := db.First(&cat).Error; err != nil {
			// Doesn't exist — create it
			cat = models.Category{ProjectID: projectID, Name: name, ParentID: parentID}
			if err := h.DB.Create(&cat).Error; err != nil {
				return nil
			}
		}
		id := cat.ID
		parentID = &id
	}
	return parentID
}

// upsertTest creates the test if it doesn't exist (matched by project+name+method+url).
// If it exists and has no category, assigns the given categoryID.
// Returns: created, updated, error
func (h *Handler) upsertTest(t models.TestRequest, catID *uint) (created bool, updated bool, err error) {
	var existing models.TestRequest
	dbErr := h.DB.Where(
		"project_id = ? AND name = ? AND method = ? AND url = ?",
		t.ProjectID, t.Name, t.Method, t.URL,
	).First(&existing).Error
	if dbErr != nil {
		// Not found — create
		t.CategoryID = catID
		if createErr := h.DB.Create(&t).Error; createErr != nil {
			return false, false, createErr
		}
		return true, false, nil
	}
	// Found — only assign category if currently unset
	if existing.CategoryID == nil && catID != nil {
		h.DB.Model(&existing).Update("category_id", catID)
		return false, true, nil
	}
	return false, false, nil
}

// --- Postman Import ---

func (h *Handler) ImportPostman(c *gin.Context) {
	var req struct {
		ProjectID  uint   `json:"projectId"`
		CategoryID *uint  `json:"categoryId"` // fallback for root-level requests
		Content    string `json:"content"`
		DryRun     bool   `json:"dryRun"`
	}
	if err := c.ShouldBindJSON(&req); err != nil || req.Content == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "projectId and content required"})
		return
	}
	if !req.DryRun {
		if !h.hasProject(c, req.ProjectID) {
			c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
			return
		}
	}

	var col postmanCollection
	if err := json.Unmarshal([]byte(req.Content), &col); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid Postman collection JSON: " + err.Error()})
		return
	}

	items := extractPostmanItems(col.Item, nil)

	if req.DryRun {
		preview := make([]map[string]string, 0, len(items))
		for _, it := range items {
			preview = append(preview, map[string]string{
				"name":         it.Name,
				"method":       it.Method,
				"url":          it.URL,
				"categoryName": it.categoryLabel(),
			})
		}
		c.JSON(http.StatusOK, gin.H{"count": len(preview), "items": preview})
		return
	}

	pathCache := map[string]*uint{}
	var created, updated, skipped int
	for _, it := range items {
		var catID *uint
		if len(it.CategoryPath) > 0 {
			key := strings.Join(it.CategoryPath, "/")
			if id, ok := pathCache[key]; ok {
				catID = id
			} else {
				catID = h.resolveCategoryPath(req.ProjectID, it.CategoryPath)
				pathCache[key] = catID
			}
		} else {
			catID = req.CategoryID
		}
		test := models.TestRequest{
			ProjectID: req.ProjectID,
			Name:      it.Name,
			Method:    it.Method,
			URL:       it.URL,
			Headers:   it.Headers,
			Body:      it.Body,
		}
		cr, up, _ := h.upsertTest(test, catID)
		if cr {
			created++
		} else if up {
			updated++
		} else {
			skipped++
		}
	}

	c.JSON(http.StatusOK, gin.H{"imported": created, "updated": updated, "skipped": skipped})
}

// extractPostmanItems recursively extracts requests, building a category path from nested folders.
func extractPostmanItems(items []postmanItem, path []string) []importedTest {
	var result []importedTest
	for _, item := range items {
		if len(item.Item) > 0 {
			result = append(result, extractPostmanItems(item.Item, append(path, item.Name))...)
			continue
		}
		if item.Request == nil {
			continue
		}
		headers := models.JSONMap{}
		for _, h := range item.Request.Header {
			if !h.Disabled && h.Key != "" {
				headers[h.Key] = h.Value
			}
		}
		body := ""
		if item.Request.Body != nil && item.Request.Body.Mode == "raw" {
			body = item.Request.Body.Raw
		}
		method := strings.ToUpper(item.Request.Method)
		if method == "" {
			method = "GET"
		}
		// Copy path slice to avoid mutation
		catPath := make([]string, len(path))
		copy(catPath, path)
		result = append(result, importedTest{
			Name:         item.Name,
			Method:       method,
			URL:          item.Request.URL.resolved(),
			CategoryPath: catPath,
			Headers:      headers,
			Body:         body,
		})
	}
	return result
}

// --- OpenAPI Import ---

func (h *Handler) ImportOpenAPI(c *gin.Context) {
	var req struct {
		ProjectID  uint   `json:"projectId"`
		CategoryID *uint  `json:"categoryId"` // fallback for untagged operations
		Content    string `json:"content"`
		DryRun     bool   `json:"dryRun"`
	}
	if err := c.ShouldBindJSON(&req); err != nil || req.Content == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "projectId and content required"})
		return
	}
	if !req.DryRun {
		if !h.hasProject(c, req.ProjectID) {
			c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
			return
		}
	}

	var spec openAPISpec
	if err := json.Unmarshal([]byte(req.Content), &spec); err != nil {
		if err2 := yaml.Unmarshal([]byte(req.Content), &spec); err2 != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid spec: must be valid JSON or YAML"})
			return
		}
	}

	items := extractOpenAPIItems(spec)

	if req.DryRun {
		preview := make([]map[string]string, 0, len(items))
		for _, it := range items {
			preview = append(preview, map[string]string{
				"name":         it.Name,
				"method":       it.Method,
				"url":          it.URL,
				"categoryName": it.categoryLabel(),
			})
		}
		c.JSON(http.StatusOK, gin.H{"count": len(preview), "items": preview})
		return
	}

	pathCache := map[string]*uint{}
	var created, updated, skipped int
	for _, it := range items {
		var catID *uint
		if len(it.CategoryPath) > 0 {
			key := strings.Join(it.CategoryPath, "/")
			if id, ok := pathCache[key]; ok {
				catID = id
			} else {
				catID = h.resolveCategoryPath(req.ProjectID, it.CategoryPath)
				pathCache[key] = catID
			}
		} else {
			catID = req.CategoryID
		}
		test := models.TestRequest{
			ProjectID: req.ProjectID,
			Name:      it.Name,
			Method:    it.Method,
			URL:       it.URL,
			Headers:   it.Headers,
			Body:      it.Body,
		}
		cr, up, _ := h.upsertTest(test, catID)
		if cr {
			created++
		} else if up {
			updated++
		} else {
			skipped++
		}
	}

	c.JSON(http.StatusOK, gin.H{"imported": created, "updated": updated, "skipped": skipped})
}

var httpMethods = map[string]bool{
	"get": true, "post": true, "put": true, "patch": true,
	"delete": true, "head": true, "options": true,
}

func extractOpenAPIItems(spec openAPISpec) []importedTest {
	baseURL := ""
	if len(spec.Servers) > 0 {
		baseURL = strings.TrimRight(spec.Servers[0].URL, "/")
	} else if spec.Host != "" {
		baseURL = fmt.Sprintf("https://%s%s", spec.Host, spec.BasePath)
	}

	var result []importedTest
	for path, pathItem := range spec.Paths {
		for method, op := range pathItem {
			if !httpMethods[strings.ToLower(method)] {
				continue
			}
			name := op.Summary
			if name == "" {
				name = op.OperationID
			}
			if name == "" {
				name = strings.ToUpper(method) + " " + path
			}

			// First tag → category (single level for OpenAPI)
			var categoryPath []string
			if len(op.Tags) > 0 {
				categoryPath = []string{op.Tags[0]}
			}

			// Build URL with example query params
			url := baseURL + path
			var queryParts []string
			for _, param := range op.Parameters {
				if param.In == "query" {
					val := ""
					if param.Example != nil {
						val = fmt.Sprintf("%v", param.Example)
					}
					queryParts = append(queryParts, param.Name+"="+val)
				}
			}
			if len(queryParts) > 0 {
				url += "?" + strings.Join(queryParts, "&")
			}

			body := ""
			headers := models.JSONMap{}
			if op.RequestBody != nil {
				for contentType, media := range op.RequestBody.Content {
					if !strings.Contains(contentType, "json") {
						continue
					}
					headers["Content-Type"] = "application/json"
					if media.Example != nil {
						if b, err := json.MarshalIndent(media.Example, "", "  "); err == nil {
							body = string(b)
						}
					} else if ex, ok := media.Schema["example"]; ok {
						if b, err := json.MarshalIndent(ex, "", "  "); err == nil {
							body = string(b)
						}
					}
					break
				}
			}

			result = append(result, importedTest{
				Name:         name,
				Method:       strings.ToUpper(method),
				URL:          url,
				CategoryPath: categoryPath,
				Headers:      headers,
				Body:         body,
			})
		}
	}
	return result
}
