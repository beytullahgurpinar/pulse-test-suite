package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/beytullahgurpinar/pulse-test-suite/internal/config"
	"github.com/beytullahgurpinar/pulse-test-suite/internal/crypto"
	"github.com/beytullahgurpinar/pulse-test-suite/internal/database"
	"github.com/beytullahgurpinar/pulse-test-suite/internal/handlers"
	"github.com/beytullahgurpinar/pulse-test-suite/internal/models"
	"github.com/beytullahgurpinar/pulse-test-suite/internal/runner"
	"github.com/beytullahgurpinar/pulse-test-suite/internal/services"
	"github.com/joho/godotenv"
	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"
	"gorm.io/gorm"
)

var (
	db            *gorm.DB
	execution     *services.ExecutionService
	projectID     uint
	environmentID *uint // from the MCP key, can be nil
	encryptionKey []byte
)

func main() {
	log.SetOutput(os.Stderr)

	// Try loading .env from the binary's own directory (works regardless of cwd)
	if execPath, err := os.Executable(); err == nil {
		_ = godotenv.Load(filepath.Join(filepath.Dir(execPath), ".env"))
	}

	cfg, err := config.Load()
	if err != nil {
		log.Fatal(err)
	}

	db, err = database.Connect(cfg)
	if err != nil {
		log.Fatal("Database:", err)
	}

	execution = services.NewExecutionService(db, cfg.EncryptionKey)
	encryptionKey = crypto.DeriveKey(cfg.EncryptionKey)

	// Authenticate via MCP_KEY env var
	mcpKey := os.Getenv("MCP_KEY")
	if mcpKey == "" {
		log.Fatal("MCP_KEY environment variable is required. Create a key in the web UI under Project > MCP Keys.")
	}

	keyRecord, err := lookupAndActivateKey(mcpKey)
	if err != nil {
		log.Fatalf("Invalid MCP_KEY: %v", err)
	}

	projectID = keyRecord.ProjectID
	environmentID = keyRecord.EnvironmentID

	envDesc := "project default environment"
	if environmentID != nil {
		envDesc = fmt.Sprintf("environment id=%d", *environmentID)
	}
	log.Printf("MCP server started: project_id=%d, %s", projectID, envDesc)

	s := server.NewMCPServer("ZotloTestSuite", "1.0.0")

	s.AddTool(
		mcp.NewTool("list_tests",
			mcp.WithDescription("List all tests in the project bound to this MCP key"),
		),
		handleListTests,
	)

	s.AddTool(
		mcp.NewTool("run_test",
			mcp.WithDescription("Run a specific test by its ID. Returns pass/fail, HTTP status code, response body, duration, and assertion results immediately."),
			mcp.WithString("test_id",
				mcp.Description("The numeric ID of the test to run (get from list_tests)"),
				mcp.Required(),
			),
		),
		handleRunTest,
	)

	s.AddTool(
		mcp.NewTool("run_all_tests",
			mcp.WithDescription("Run all tests in the project. Returns a summary of pass/fail for each test."),
		),
		handleRunAllTests,
	)

	s.AddTool(
		mcp.NewTool("list_flows",
			mcp.WithDescription("List all flows (test sequences) in the project bound to this MCP key"),
		),
		handleListFlows,
	)

	s.AddTool(
		mcp.NewTool("run_flow",
			mcp.WithDescription("Run a flow (ordered sequence of tests with data extraction). Returns step-by-step results immediately."),
			mcp.WithString("flow_id",
				mcp.Description("The numeric ID of the flow to run (get from list_flows)"),
				mcp.Required(),
			),
		),
		handleRunFlow,
	)

	s.AddTool(
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
		handleCreateTest,
	)

	if err := server.ServeStdio(s); err != nil {
		log.Fatal(err)
	}
}

func lookupAndActivateKey(fullKey string) (*models.MCPKey, error) {
	hash := handlers.HashMCPKey(fullKey)
	var key models.MCPKey
	if err := db.Where("key_hash = ?", hash).First(&key).Error; err != nil {
		return nil, fmt.Errorf("key not found or revoked")
	}
	// Update last_used_at
	now := time.Now()
	db.Model(&key).Update("last_used_at", now)
	return &key, nil
}

func handleListTests(_ context.Context, _ mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	type testSummary struct {
		ID     uint   `json:"id"`
		Name   string `json:"name"`
		Method string `json:"method"`
		URL    string `json:"url"`
	}

	var tests []models.TestRequest
	if err := db.Select("id, name, method, url").
		Where("project_id = ?", projectID).
		Find(&tests).Error; err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}

	summaries := make([]testSummary, len(tests))
	for i, t := range tests {
		summaries[i] = testSummary{t.ID, t.Name, t.Method, t.URL}
	}
	b, _ := json.MarshalIndent(summaries, "", "  ")
	return mcp.NewToolResultText(string(b)), nil
}

func handleRunTest(_ context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	args := req.GetArguments()
	testIDStr, _ := args["test_id"].(string)

	testID, err := strconv.Atoi(testIDStr)
	if err != nil || testID == 0 {
		return mcp.NewToolResultError("invalid test_id: must be a numeric ID"), nil
	}

	var test models.TestRequest
	if err := db.Preload("Assertions").First(&test, testID).Error; err != nil {
		return mcp.NewToolResultError(fmt.Sprintf("test id=%s not found", testIDStr)), nil
	}
	if test.ProjectID != projectID {
		return mcp.NewToolResultError("test does not belong to this project"), nil
	}

	testRun, err := execution.ExecuteAndSaveTest(&test, nil, environmentID)
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}

	responseBody := crypto.DecryptField(testRun.ResponseBody, encryptionKey)
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
	sb.WriteString(fmt.Sprintf("[%s] %s %s\n", statusIcon, test.Method, testRun.RequestURL))
	sb.WriteString(fmt.Sprintf("HTTP Status: %d | Duration: %dms\n", testRun.StatusCode, testRun.DurationMs))

	if testRun.ErrorMessage != "" {
		sb.WriteString(fmt.Sprintf("Error: %s\n", testRun.ErrorMessage))
	}

	if len(ar) > 0 {
		sb.WriteString("\nAssertions:\n")
		for _, a := range ar {
			icon := "  PASS"
			if !a.Passed {
				icon = "  FAIL"
			}
			if a.Message != "" {
				sb.WriteString(fmt.Sprintf("%s [%s] %s\n", icon, a.Type, a.Message))
			} else {
				sb.WriteString(fmt.Sprintf("%s [%s]\n", icon, a.Type))
			}
		}
	}

	sb.WriteString("\nResponse Body:\n")
	sb.WriteString(responseBody)

	return mcp.NewToolResultText(sb.String()), nil
}

func handleListFlows(_ context.Context, _ mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	type flowSummary struct {
		ID        uint   `json:"id"`
		Name      string `json:"name"`
		StepCount int    `json:"stepCount"`
	}

	var flows []models.Flow
	if err := db.Preload("Steps").Where("project_id = ?", projectID).Find(&flows).Error; err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}

	summaries := make([]flowSummary, len(flows))
	for i, f := range flows {
		summaries[i] = flowSummary{f.ID, f.Name, len(f.Steps)}
	}
	b, _ := json.MarshalIndent(summaries, "", "  ")
	return mcp.NewToolResultText(string(b)), nil
}

func handleRunFlow(_ context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	args := req.GetArguments()
	flowIDStr, _ := args["flow_id"].(string)

	flowID, err := strconv.Atoi(flowIDStr)
	if err != nil || flowID == 0 {
		return mcp.NewToolResultError("invalid flow_id: must be a numeric ID"), nil
	}

	// Verify flow belongs to this project
	var flow models.Flow
	if err := db.First(&flow, flowID).Error; err != nil {
		return mcp.NewToolResultError(fmt.Sprintf("flow id=%s not found", flowIDStr)), nil
	}
	if flow.ProjectID != projectID {
		return mcp.NewToolResultError("flow does not belong to this project"), nil
	}

	flowRun, err := execution.ExecuteAndSaveFlow(uint(flowID), nil, environmentID)
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}

	// Reload with steps + nested test runs (ExecuteAndSaveFlow doesn't preload them)
	var fullFlowRun models.FlowRun
	if err := db.Preload("Steps.TestRun").First(&fullFlowRun, flowRun.ID).Error; err == nil {
		flowRun = &fullFlowRun
	}

	statusIcon := "PASSED"
	if flowRun.Status != "passed" {
		statusIcon = "FAILED"
	}

	var sb strings.Builder
	sb.WriteString(fmt.Sprintf("[%s] Flow: %s | %dms\n", statusIcon, flow.Name, flowRun.DurationMs))
	sb.WriteString(fmt.Sprintf("Steps: %d\n\n", len(flowRun.Steps)))

	for i, step := range flowRun.Steps {
		stepIcon := "PASS"
		if step.Status != "passed" {
			stepIcon = "FAIL"
		}
		stepLine := fmt.Sprintf("  Step %d [%s]", i+1, stepIcon)
		if step.TestRun.RequestMethod != "" {
			stepLine += fmt.Sprintf(" %s %s → HTTP %d (%dms)",
				step.TestRun.RequestMethod,
				step.TestRun.RequestURL,
				step.TestRun.StatusCode,
				step.TestRun.DurationMs,
			)
		}
		if step.TestRun.ErrorMessage != "" {
			stepLine += fmt.Sprintf(" ERROR: %s", step.TestRun.ErrorMessage)
		}
		sb.WriteString(stepLine + "\n")

		if step.ExtractedData != "" && step.ExtractedData != "{}" {
			sb.WriteString(fmt.Sprintf("    Extracted: %s\n", step.ExtractedData))
		}
	}

	return mcp.NewToolResultText(sb.String()), nil
}

func handleCreateTest(_ context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	args := req.GetArguments()

	name, _ := args["name"].(string)
	method, _ := args["method"].(string)
	url, _ := args["url"].(string)

	if name == "" || method == "" || url == "" {
		return mcp.NewToolResultError("name, method, and url are required"), nil
	}

	test := models.TestRequest{
		ProjectID: projectID,
		Name:      name,
		Method:    strings.ToUpper(method),
		URL:       url,
	}

	// Parse optional headers
	if headersStr, _ := args["headers"].(string); headersStr != "" {
		var h models.JSONMap
		if err := json.Unmarshal([]byte(headersStr), &h); err != nil {
			return mcp.NewToolResultError("invalid headers JSON: " + err.Error()), nil
		}
		test.Headers = h
	}

	// Optional body
	if body, _ := args["body"].(string); body != "" {
		test.Body = body
	}

	// Parse optional assertions
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

	// Save test + assertions in a transaction
	if err := db.Transaction(func(tx *gorm.DB) error {
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

func handleRunAllTests(_ context.Context, _ mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	var tests []models.TestRequest
	if err := db.Preload("Assertions").Where("project_id = ?", projectID).Find(&tests).Error; err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}
	if len(tests) == 0 {
		return mcp.NewToolResultText("No tests found in this project."), nil
	}

	type testResult struct {
		TestID     uint   `json:"testId"`
		TestName   string `json:"testName"`
		Passed     bool   `json:"passed"`
		StatusCode int    `json:"statusCode"`
		DurationMs int64  `json:"durationMs"`
		Error      string `json:"error,omitempty"`
	}

	results := make([]testResult, 0, len(tests))
	passed, failed := 0, 0

	for _, test := range tests {
		testRun, err := execution.ExecuteAndSaveTest(&test, nil, environmentID)
		if err != nil {
			results = append(results, testResult{TestID: test.ID, TestName: test.Name, Error: err.Error()})
			failed++
			continue
		}
		p := testRun.Status == "passed"
		if p {
			passed++
		} else {
			failed++
		}
		results = append(results, testResult{
			TestID:     test.ID,
			TestName:   test.Name,
			Passed:     p,
			StatusCode: testRun.StatusCode,
			DurationMs: testRun.DurationMs,
			Error:      testRun.ErrorMessage,
		})
	}

	var sb strings.Builder
	sb.WriteString(fmt.Sprintf("Results: %d/%d passed\n\n", passed, passed+failed))
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
			line += fmt.Sprintf(" - Error: %s", r.Error)
		}
		sb.WriteString(line + "\n")
	}

	b, _ := json.MarshalIndent(results, "", "  ")
	sb.WriteString("\nJSON:\n")
	sb.WriteString(string(b))

	return mcp.NewToolResultText(sb.String()), nil
}
