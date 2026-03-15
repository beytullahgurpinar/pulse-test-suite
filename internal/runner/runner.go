package runner

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/beytullahgurpinar/pulse-test-suite/internal/models"
	"github.com/tidwall/gjson"
	"github.com/xeipuuv/gojsonschema"
)

// isPrivateIP checks if an IP is in a private/reserved range (SSRF protection)
func isPrivateIP(ip net.IP) bool {
	privateRanges := []string{
		"127.0.0.0/8", "10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16",
		"169.254.0.0/16", "::1/128", "fc00::/7", "fe80::/10",
	}
	for _, cidr := range privateRanges {
		_, network, _ := net.ParseCIDR(cidr)
		if network.Contains(ip) {
			return true
		}
	}
	return false
}

// validateTestURL blocks requests to internal/private addresses
func validateTestURL(rawURL string) error {
	u, err := url.Parse(rawURL)
	if err != nil {
		return fmt.Errorf("invalid URL: %w", err)
	}
	host := u.Hostname()
	if host == "" {
		return fmt.Errorf("empty hostname")
	}
	// Block cloud metadata endpoints
	if host == "169.254.169.254" || host == "metadata.google.internal" {
		return fmt.Errorf("access to cloud metadata is blocked")
	}
	ips, err := net.LookupIP(host)
	if err != nil {
		return nil // let the HTTP client handle DNS failures
	}
	for _, ip := range ips {
		if isPrivateIP(ip) {
			return fmt.Errorf("access to private/internal addresses is blocked")
		}
	}
	return nil
}

type AssertionResult struct {
	AssertionID uint   `json:"assertionId"`
	Type        string `json:"type"`
	Key         string `json:"key"`
	Passed      bool   `json:"passed"`
	Expected    string `json:"expected"`
	Actual      string `json:"actual"`
	Message     string `json:"message"`
}

type RunResult struct {
	StatusCode       int
	ResponseBody     string
	ResponseHeaders  map[string]string
	DurationMs       int64
	Passed           bool
	AssertionResults []AssertionResult
	Error            string
	// Actual request sent (after env/placeholder substitution)
	RequestMethod  string
	RequestURL     string
	RequestHeaders map[string]string
	RequestBody    string
}

func ExecuteTest(req *models.TestRequest, envVars map[string]string) *RunResult {
	result := &RunResult{AssertionResults: []AssertionResult{}}
	start := time.Now()

	// Build HTTP request and capture actual values sent
	httpReq, reqSnapshot, err := buildRequest(req, envVars)
	if err != nil {
		result.Error = err.Error()
		result.Passed = false
		return result
	}
	result.RequestMethod = reqSnapshot.Method
	result.RequestURL = reqSnapshot.URL
	result.RequestHeaders = reqSnapshot.Headers
	result.RequestBody = reqSnapshot.Body

	// SSRF protection: block requests to private/internal addresses
	if err := validateTestURL(reqSnapshot.URL); err != nil {
		result.Error = err.Error()
		result.Passed = false
		return result
	}

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(httpReq)
	result.DurationMs = time.Since(start).Milliseconds()

	if err != nil {
		result.Error = err.Error()
		result.Passed = false
		return result
	}
	defer resp.Body.Close()

	bodyBytes, _ := io.ReadAll(resp.Body)
	result.ResponseBody = string(bodyBytes)
	result.StatusCode = resp.StatusCode

	// Capture response headers
	respHeaders := make(map[string]string)
	for k, v := range resp.Header {
		if len(v) > 0 {
			respHeaders[k] = v[0]
		}
	}
	result.ResponseHeaders = respHeaders

	// Run assertions
	allPassed := true
	for _, a := range req.Assertions {
		ar := runAssertion(&a, result.StatusCode, result.ResponseBody, respHeaders, result.DurationMs, envVars)
		result.AssertionResults = append(result.AssertionResults, ar)
		if !ar.Passed {
			allPassed = false
		}
	}

	result.Passed = allPassed
	return result
}

type requestSnapshot struct {
	Method  string
	URL     string
	Headers map[string]string
	Body    string
}

func buildRequest(req *models.TestRequest, envVars map[string]string) (*http.Request, *requestSnapshot, error) {
	// Process env vars and placeholders ({{guid}}, {{email}}, etc.)
	method := strings.ToUpper(req.Method)
	body := ProcessWithEnv(req.Body, envVars)

	// GET and HEAD must not carry a body
	bodyless := method == "GET" || method == "HEAD"
	if bodyless {
		body = ""
	}

	var bodyReader io.Reader
	if body != "" {
		bodyReader = bytes.NewBufferString(body)
	}

	url := ProcessWithEnv(req.URL, envVars)
	httpReq, err := http.NewRequest(method, url, bodyReader)
	if err != nil {
		return nil, nil, err
	}

	headers := make(map[string]string)
	if req.Headers != nil {
		for k, v := range req.Headers {
			if s, ok := v.(string); ok {
				val := ProcessWithEnv(s, envVars)
				httpReq.Header.Set(k, val)
				headers[k] = val
			}
		}
	}
	// Only set Content-Type for requests that actually send a body
	if !bodyless && body != "" {
		httpReq.Header.Set("Content-Type", "application/json")
		headers["Content-Type"] = "application/json"
	}

	snapshot := &requestSnapshot{
		Method:  method,
		URL:     url,
		Headers: headers,
		Body:    body,
	}
	return httpReq, snapshot, nil
}

func runAssertion(a *models.Assertion, statusCode int, responseBody string, responseHeaders map[string]string, durationMs int64, envVars map[string]string) AssertionResult {
	// Resolve {{VAR}} placeholders in expectedValue (env vars + flow extractions)
	expectedValue := ProcessWithEnv(a.ExpectedValue, envVars)

	ar := AssertionResult{
		AssertionID: a.ID,
		Type:        a.Type,
		Key:         a.Key,
		Expected:    expectedValue,
	}

	switch a.Type {
	case "status":
		actual := fmt.Sprintf("%d", statusCode)
		ar.Actual = actual
		ar.Passed = actual == expectedValue
		if !ar.Passed {
			ar.Message = fmt.Sprintf("Expected status %s, got %s", expectedValue, actual)
		}

	case "json_path":
		value := gjson.Get(responseBody, a.Key)
		actual := value.String()
		ar.Actual = actual

		switch a.Operator {
		case "eq", "equals":
			ar.Passed = compareEquals(actual, expectedValue, value)
		case "ne", "not_equals":
			ar.Passed = !compareEquals(actual, expectedValue, value)
		case "contains":
			ar.Passed = strings.Contains(actual, expectedValue)
		case "exists":
			ar.Passed = value.Exists()
		case "not_exists":
			ar.Passed = !value.Exists()
		case "is_null":
			ar.Passed = value.Exists() && value.Type == gjson.Null
			if !ar.Passed {
				ar.Message = fmt.Sprintf("Path %s: expected null, got %s", a.Key, formatActual(value))
			}
		case "is_not_null":
			ar.Passed = value.Exists() && value.Type != gjson.Null
			if !ar.Passed {
				ar.Message = fmt.Sprintf("Path %s: expected non-null value, got %s", a.Key, formatActual(value))
			}
		case "is_true":
			ar.Passed = value.Type == gjson.True
			if !ar.Passed {
				ar.Message = fmt.Sprintf("Path %s: expected true, got %s", a.Key, formatActual(value))
			}
		case "is_false":
			ar.Passed = value.Type == gjson.False
			if !ar.Passed {
				ar.Message = fmt.Sprintf("Path %s: expected false, got %s", a.Key, formatActual(value))
			}
		default:
			ar.Passed = compareEquals(actual, expectedValue, value)
		}

		if !ar.Passed && ar.Message == "" {
			ar.Message = fmt.Sprintf("Path %s: expected %s, got %s", a.Key, expectedValue, actual)
		}

	case "response_time":
		ar.Actual = fmt.Sprintf("%dms", durationMs)
		expectedMs, err := strconv.ParseInt(strings.TrimSpace(expectedValue), 10, 64)
		if err != nil {
			ar.Passed = false
			ar.Message = fmt.Sprintf("Invalid duration value: %s", expectedValue)
			break
		}
		switch a.Operator {
		case "lt", "":
			ar.Passed = durationMs < expectedMs
		case "lte":
			ar.Passed = durationMs <= expectedMs
		case "gt":
			ar.Passed = durationMs > expectedMs
		case "gte":
			ar.Passed = durationMs >= expectedMs
		default:
			ar.Passed = durationMs < expectedMs
		}
		if !ar.Passed {
			ar.Message = fmt.Sprintf("Response time %dms did not satisfy %s %dms", durationMs, a.Operator, expectedMs)
		}

	case "header":
		// Case-insensitive header lookup
		actual := ""
		keyLower := strings.ToLower(a.Key)
		for k, v := range responseHeaders {
			if strings.ToLower(k) == keyLower {
				actual = v
				break
			}
		}
		ar.Actual = actual
		switch a.Operator {
		case "eq", "equals", "":
			ar.Passed = actual == expectedValue
			if !ar.Passed {
				ar.Message = fmt.Sprintf("Header %s: expected %q, got %q", a.Key, expectedValue, actual)
			}
		case "ne", "not_equals":
			ar.Passed = actual != expectedValue
			if !ar.Passed {
				ar.Message = fmt.Sprintf("Header %s: expected not %q", a.Key, expectedValue)
			}
		case "contains":
			ar.Passed = strings.Contains(actual, expectedValue)
			if !ar.Passed {
				ar.Message = fmt.Sprintf("Header %s: %q does not contain %q", a.Key, actual, expectedValue)
			}
		case "exists":
			ar.Passed = actual != ""
			if !ar.Passed {
				ar.Message = fmt.Sprintf("Header %s not present in response", a.Key)
			}
		case "not_exists":
			ar.Passed = actual == ""
			if !ar.Passed {
				ar.Message = fmt.Sprintf("Header %s should not be present", a.Key)
			}
		}

	case "json_schema":
		schemaLoader := gojsonschema.NewStringLoader(expectedValue)
		docLoader := gojsonschema.NewStringLoader(responseBody)
		result, err := gojsonschema.Validate(schemaLoader, docLoader)
		if err != nil {
			ar.Passed = false
			ar.Message = "Schema validation error: " + err.Error()
			break
		}
		ar.Passed = result.Valid()
		if !ar.Passed {
			errs := result.Errors()
			msgs := make([]string, 0, len(errs))
			for _, e := range errs {
				msgs = append(msgs, e.String())
			}
			ar.Message = strings.Join(msgs, "; ")
			ar.Actual = fmt.Sprintf("%d violation(s)", len(errs))
		} else {
			ar.Actual = "valid"
		}

	default:
		ar.Passed = false
		ar.Message = "Unknown assertion type"
	}

	return ar
}

func formatActual(value gjson.Result) string {
	if !value.Exists() {
		return "(none)"
	}
	switch value.Type {
	case gjson.Null:
		return "null"
	case gjson.True:
		return "true"
	case gjson.False:
		return "false"
	default:
		s := value.String()
		if len(s) > 50 {
			return s[:47] + "..."
		}
		return s
	}
}

func compareEquals(actual, expected string, value gjson.Result) bool {
	exp := strings.TrimSpace(strings.ToLower(expected))
	switch exp {
	case "null":
		return value.Exists() && value.Type == gjson.Null
	case "true":
		return value.Type == gjson.True
	case "false":
		return value.Type == gjson.False
	default:
		return actual == expected
	}
}

// PrettyPrint JSON
func PrettyJSON(s string) string {
	var m interface{}
	if err := json.Unmarshal([]byte(s), &m); err != nil {
		return s
	}
	b, _ := json.MarshalIndent(m, "", "  ")
	return string(b)
}
