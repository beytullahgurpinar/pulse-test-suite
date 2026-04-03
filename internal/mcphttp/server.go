package mcphttp

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/beytullahgurpinar/pulse-test-suite/internal/crypto"
	"github.com/beytullahgurpinar/pulse-test-suite/internal/handlers"
	"github.com/beytullahgurpinar/pulse-test-suite/internal/models"
	"github.com/beytullahgurpinar/pulse-test-suite/internal/runner"
	"github.com/beytullahgurpinar/pulse-test-suite/internal/services"
	"github.com/gin-gonic/gin"
	"github.com/mark3labs/mcp-go/mcp"
	mcpserver "github.com/mark3labs/mcp-go/server"
	"gorm.io/gorm"
)

type contextKey int

const (
	ctxProjectID contextKey = iota
	ctxEnvID
)

// Handler wraps the MCP HTTP server and Gin middleware.
type Handler struct {
	db            *gorm.DB
	execution     *services.ExecutionService
	encryptionKey []byte
	httpHandler   http.Handler
}

// New creates the MCP HTTP handler. Mount with:
//
//	r.Any("/mcp", h.Auth, h.Serve)
func New(db *gorm.DB, encryptionKey string) *Handler {
	h := &Handler{
		db:            db,
		execution:     services.NewExecutionService(db, encryptionKey),
		encryptionKey: crypto.DeriveKey(encryptionKey),
	}

	mcpSrv := mcpserver.NewMCPServer("ZotloTestSuite", "1.0.0")

	mcpSrv.AddTool(
		mcp.NewTool("list_tests",
			mcp.WithDescription("List all tests in the project bound to this MCP key"),
		),
		h.handleListTests,
	)
	mcpSrv.AddTool(
		mcp.NewTool("run_test",
			mcp.WithDescription("Run a specific test by ID. Returns pass/fail, HTTP status, response body, duration and assertion results immediately."),
			mcp.WithString("test_id",
				mcp.Description("Numeric ID of the test to run (from list_tests)"),
				mcp.Required(),
			),
		),
		h.handleRunTest,
	)
	mcpSrv.AddTool(
		mcp.NewTool("run_all_tests",
			mcp.WithDescription("Run all tests in the project. Returns pass/fail summary for each test."),
		),
		h.handleRunAllTests,
	)
	mcpSrv.AddTool(
		mcp.NewTool("list_flows",
			mcp.WithDescription("List all flows in the project bound to this MCP key"),
		),
		h.handleListFlows,
	)
	mcpSrv.AddTool(
		mcp.NewTool("run_flow",
			mcp.WithDescription("Run a flow (ordered sequence of tests). Returns step-by-step results immediately."),
			mcp.WithString("flow_id",
				mcp.Description("Numeric ID of the flow to run (from list_flows)"),
				mcp.Required(),
			),
		),
		h.handleRunFlow,
	)
	mcpSrv.AddTool(
		mcp.NewTool("create_test",
			mcp.WithDescription("Create a new API test in the project. Optionally include assertions. Returns the created test ID."),
			mcp.WithString("name",
				mcp.Description("Name of the test"),
				mcp.Required(),
			),
			mcp.WithString("method",
				mcp.Description("HTTP method: GET, POST, PUT, PATCH, DELETE"),
				mcp.Required(),
			),
			mcp.WithString("url",
				mcp.Description("Full URL to test, e.g. https://api.example.com/users"),
				mcp.Required(),
			),
			mcp.WithString("headers",
				mcp.Description(`Optional JSON object of request headers, e.g. {"Authorization":"Bearer token","Content-Type":"application/json"}`),
			),
			mcp.WithString("body",
				mcp.Description("Optional request body (JSON string or plain text)"),
			),
			mcp.WithString("assertions",
				mcp.Description(`Optional JSON array of assertions. Each item: {"type":"status","operator":"eq","expectedValue":"200"} or {"type":"json_path","key":"data.id","operator":"exists"} — operators: eq, ne, contains, exists`),
			),
		),
		h.handleCreateTest,
	)

	// Pass the enriched request context straight through to tool handlers.
	httpSrv := mcpserver.NewStreamableHTTPServer(mcpSrv,
		mcpserver.WithHTTPContextFunc(func(ctx context.Context, r *http.Request) context.Context {
			return r.Context()
		}),
	)
	h.httpHandler = httpSrv
	return h
}

// Auth is a Gin middleware that validates the MCP key and enriches the request context.
func (h *Handler) Auth(c *gin.Context) {
	key := c.Query("key")
	if key == "" {
		key = c.GetHeader("X-MCP-Key")
	}
	if key == "" {
		c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "MCP key required (?key=zts_... or X-MCP-Key header)"})
		return
	}

	hash := handlers.HashMCPKey(key)
	var keyRecord models.MCPKey
	if err := h.db.Where("key_hash = ?", hash).First(&keyRecord).Error; err != nil {
		c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid or revoked MCP key"})
		return
	}

	// Update last_used_at asynchronously
	go h.db.Model(&keyRecord).Update("last_used_at", time.Now())

	// Inject project + optional env into request context
	ctx := context.WithValue(c.Request.Context(), ctxProjectID, keyRecord.ProjectID)
	if keyRecord.EnvironmentID != nil {
		ctx = context.WithValue(ctx, ctxEnvID, keyRecord.EnvironmentID)
	}
	c.Request = c.Request.WithContext(ctx)
	c.Next()
}

// Serve is the Gin handler that delegates to the MCP HTTP server.
func (h *Handler) Serve(c *gin.Context) {
	h.httpHandler.ServeHTTP(c.Writer, c.Request)
}

// --- helpers ---

func projectFromCtx(ctx context.Context) (uint, bool) {
	v, ok := ctx.Value(ctxProjectID).(uint)
	return v, ok && v > 0
}

func envFromCtx(ctx context.Context) *uint {
	v, _ := ctx.Value(ctxEnvID).(*uint)
	return v
}

// --- tool handlers ---

func (h *Handler) handleListTests(ctx context.Context, _ mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	pid, ok := projectFromCtx(ctx)
	if !ok {
		return mcp.NewToolResultError("unauthorized"), nil
	}

	type testSummary struct {
		ID     uint   `json:"id"`
		Name   string `json:"name"`
		Method string `json:"method"`
		URL    string `json:"url"`
	}
	var tests []models.TestRequest
	if err := h.db.Select("id, name, method, url").Where("project_id = ?", pid).Find(&tests).Error; err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}
	summaries := make([]testSummary, len(tests))
	for i, t := range tests {
		summaries[i] = testSummary{t.ID, t.Name, t.Method, t.URL}
	}
	b, _ := json.MarshalIndent(summaries, "", "  ")
	return mcp.NewToolResultText(string(b)), nil
}

func (h *Handler) handleRunTest(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	pid, ok := projectFromCtx(ctx)
	if !ok {
		return mcp.NewToolResultError("unauthorized"), nil
	}
	args := req.GetArguments()
	testIDStr, _ := args["test_id"].(string)

	var testID uint
	fmt.Sscan(testIDStr, &testID)
	if testID == 0 {
		return mcp.NewToolResultError("invalid test_id"), nil
	}

	var test models.TestRequest
	if err := h.db.Preload("Assertions").First(&test, testID).Error; err != nil {
		return mcp.NewToolResultError(fmt.Sprintf("test id=%d not found", testID)), nil
	}
	if test.ProjectID != pid {
		return mcp.NewToolResultError("test does not belong to this project"), nil
	}

	testRun, err := h.execution.ExecuteAndSaveTest(&test, nil, envFromCtx(ctx))
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}

	responseBody := crypto.DecryptField(testRun.ResponseBody, h.encryptionKey)
	if len(responseBody) > 2000 {
		responseBody = responseBody[:2000] + "\n... (truncated)"
	}

	var ar []runner.AssertionResult
	if testRun.AssertionResults != "" {
		_ = json.Unmarshal([]byte(testRun.AssertionResults), &ar)
	}

	statusIcon := "PASSED"
	if testRun.Status != "passed" {
		statusIcon = "FAILED"
	}
	var sb strings.Builder
	fmt.Fprintf(&sb, "[%s] %s %s\nHTTP Status: %d | Duration: %dms\n", statusIcon, test.Method, testRun.RequestURL, testRun.StatusCode, testRun.DurationMs)
	if testRun.ErrorMessage != "" {
		fmt.Fprintf(&sb, "Error: %s\n", testRun.ErrorMessage)
	}
	if len(ar) > 0 {
		sb.WriteString("\nAssertions:\n")
		for _, a := range ar {
			icon := "  PASS"
			if !a.Passed {
				icon = "  FAIL"
			}
			if a.Message != "" {
				fmt.Fprintf(&sb, "%s [%s] %s\n", icon, a.Type, a.Message)
			} else {
				fmt.Fprintf(&sb, "%s [%s]\n", icon, a.Type)
			}
		}
	}
	sb.WriteString("\nResponse Body:\n")
	sb.WriteString(responseBody)
	return mcp.NewToolResultText(sb.String()), nil
}

func (h *Handler) handleRunAllTests(ctx context.Context, _ mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	pid, ok := projectFromCtx(ctx)
	if !ok {
		return mcp.NewToolResultError("unauthorized"), nil
	}

	var tests []models.TestRequest
	if err := h.db.Preload("Assertions").Where("project_id = ?", pid).Find(&tests).Error; err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}
	if len(tests) == 0 {
		return mcp.NewToolResultText("No tests found in this project."), nil
	}

	type result struct {
		TestID     uint   `json:"testId"`
		TestName   string `json:"testName"`
		Passed     bool   `json:"passed"`
		StatusCode int    `json:"statusCode"`
		DurationMs int64  `json:"durationMs"`
		Error      string `json:"error,omitempty"`
	}
	results := make([]result, 0, len(tests))
	passed, failed := 0, 0
	envID := envFromCtx(ctx)

	for _, test := range tests {
		testRun, err := h.execution.ExecuteAndSaveTest(&test, nil, envID)
		if err != nil {
			results = append(results, result{TestID: test.ID, TestName: test.Name, Error: err.Error()})
			failed++
			continue
		}
		p := testRun.Status == "passed"
		if p {
			passed++
		} else {
			failed++
		}
		results = append(results, result{
			TestID: test.ID, TestName: test.Name, Passed: p,
			StatusCode: testRun.StatusCode, DurationMs: testRun.DurationMs,
			Error: testRun.ErrorMessage,
		})
	}

	var sb strings.Builder
	fmt.Fprintf(&sb, "Results: %d/%d passed\n\n", passed, passed+failed)
	for _, r := range results {
		icon := "PASS"
		if !r.Passed {
			icon = "FAIL"
		}
		line := fmt.Sprintf("[%s] [id:%d] %s", icon, r.TestID, r.TestName)
		if r.StatusCode > 0 {
			line += fmt.Sprintf(" - HTTP %d (%dms)", r.StatusCode, r.DurationMs)
		}
		if r.Error != "" {
			line += " - Error: " + r.Error
		}
		sb.WriteString(line + "\n")
	}
	b, _ := json.MarshalIndent(results, "", "  ")
	sb.WriteString("\nJSON:\n")
	sb.WriteString(string(b))
	return mcp.NewToolResultText(sb.String()), nil
}

func (h *Handler) handleListFlows(ctx context.Context, _ mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	pid, ok := projectFromCtx(ctx)
	if !ok {
		return mcp.NewToolResultError("unauthorized"), nil
	}

	type flowSummary struct {
		ID        uint   `json:"id"`
		Name      string `json:"name"`
		StepCount int    `json:"stepCount"`
	}
	var flows []models.Flow
	if err := h.db.Preload("Steps").Where("project_id = ?", pid).Find(&flows).Error; err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}
	summaries := make([]flowSummary, len(flows))
	for i, f := range flows {
		summaries[i] = flowSummary{f.ID, f.Name, len(f.Steps)}
	}
	b, _ := json.MarshalIndent(summaries, "", "  ")
	return mcp.NewToolResultText(string(b)), nil
}

func (h *Handler) handleCreateTest(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	pid, ok := projectFromCtx(ctx)
	if !ok {
		return mcp.NewToolResultError("unauthorized"), nil
	}
	args := req.GetArguments()

	name, _ := args["name"].(string)
	method, _ := args["method"].(string)
	url, _ := args["url"].(string)
	if name == "" || method == "" || url == "" {
		return mcp.NewToolResultError("name, method, and url are required"), nil
	}

	test := models.TestRequest{
		ProjectID: pid,
		Name:      name,
		Method:    strings.ToUpper(method),
		URL:       url,
	}

	if headersStr, _ := args["headers"].(string); headersStr != "" {
		var h models.JSONMap
		if err := json.Unmarshal([]byte(headersStr), &h); err != nil {
			return mcp.NewToolResultError("invalid headers JSON: " + err.Error()), nil
		}
		test.Headers = h
	}
	if body, _ := args["body"].(string); body != "" {
		test.Body = body
	}

	var assertions []models.Assertion
	if assertionsStr, _ := args["assertions"].(string); assertionsStr != "" {
		type assertionInput struct {
			Type          string `json:"type"`
			Key           string `json:"key"`
			Operator      string `json:"operator"`
			ExpectedValue string `json:"expectedValue"`
		}
		var inputs []assertionInput
		if err := json.Unmarshal([]byte(assertionsStr), &inputs); err != nil {
			return mcp.NewToolResultError("invalid assertions JSON: " + err.Error()), nil
		}
		for _, a := range inputs {
			assertions = append(assertions, models.Assertion{
				Type:          a.Type,
				Key:           a.Key,
				Operator:      a.Operator,
				ExpectedValue: a.ExpectedValue,
			})
		}
	}

	if err := h.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&test).Error; err != nil {
			return err
		}
		for i := range assertions {
			assertions[i].TestRequestID = test.ID
		}
		if len(assertions) > 0 {
			return tx.Create(&assertions).Error
		}
		return nil
	}); err != nil {
		return mcp.NewToolResultError("failed to create test: " + err.Error()), nil
	}

	var sb strings.Builder
	fmt.Fprintf(&sb, "Test created successfully!\nID: %d\nName: %s\nMethod: %s\nURL: %s\n", test.ID, test.Name, test.Method, test.URL)
	if len(assertions) > 0 {
		fmt.Fprintf(&sb, "Assertions: %d added\n", len(assertions))
	}
	fmt.Fprintf(&sb, "\nRun it with: run_test {\"test_id\": \"%d\"}", test.ID)
	return mcp.NewToolResultText(sb.String()), nil
}

func (h *Handler) handleRunFlow(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	pid, ok := projectFromCtx(ctx)
	if !ok {
		return mcp.NewToolResultError("unauthorized"), nil
	}
	args := req.GetArguments()
	flowIDStr, _ := args["flow_id"].(string)

	var flowID uint
	fmt.Sscan(flowIDStr, &flowID)
	if flowID == 0 {
		return mcp.NewToolResultError("invalid flow_id"), nil
	}

	var flow models.Flow
	if err := h.db.First(&flow, flowID).Error; err != nil {
		return mcp.NewToolResultError(fmt.Sprintf("flow id=%d not found", flowID)), nil
	}
	if flow.ProjectID != pid {
		return mcp.NewToolResultError("flow does not belong to this project"), nil
	}

	flowRun, err := h.execution.ExecuteAndSaveFlow(flowID, nil, envFromCtx(ctx))
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}

	// Reload steps with nested test run data
	var fullRun models.FlowRun
	if err := h.db.Preload("Steps.TestRun").First(&fullRun, flowRun.ID).Error; err == nil {
		flowRun = &fullRun
	}

	statusIcon := "PASSED"
	if flowRun.Status != "passed" {
		statusIcon = "FAILED"
	}
	var sb strings.Builder
	fmt.Fprintf(&sb, "[%s] Flow: %s | %dms\nSteps: %d\n\n", statusIcon, flow.Name, flowRun.DurationMs, len(flowRun.Steps))
	for i, step := range flowRun.Steps {
		stepIcon := "PASS"
		if step.Status != "passed" {
			stepIcon = "FAIL"
		}
		line := fmt.Sprintf("  Step %d [%s]", i+1, stepIcon)
		if step.TestRun.RequestMethod != "" {
			line += fmt.Sprintf(" %s %s → HTTP %d (%dms)", step.TestRun.RequestMethod, step.TestRun.RequestURL, step.TestRun.StatusCode, step.TestRun.DurationMs)
		}
		if step.TestRun.ErrorMessage != "" {
			line += " ERROR: " + step.TestRun.ErrorMessage
		}
		sb.WriteString(line + "\n")
		if step.ExtractedData != "" && step.ExtractedData != "{}" {
			fmt.Fprintf(&sb, "    Extracted: %s\n", step.ExtractedData)
		}
	}
	return mcp.NewToolResultText(sb.String()), nil
}
