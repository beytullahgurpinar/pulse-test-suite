package services

import (
	"encoding/json"
	"log"
	"sort"
	"strings"

	"zotlotestsuite/internal/crypto"
	"zotlotestsuite/internal/models"
	"zotlotestsuite/internal/runner"

	"github.com/tidwall/gjson"
	"gorm.io/gorm"
)

type ExecutionService struct {
	DB            *gorm.DB
	EncryptionKey []byte
}

func NewExecutionService(db *gorm.DB, encryptionKey string) *ExecutionService {
	return &ExecutionService{
		DB:            db,
		EncryptionKey: crypto.DeriveKey(encryptionKey),
	}
}

// LoadEnvMap loads env vars for project, decrypts secured ones
func (s *ExecutionService) LoadEnvMap(projectID uint) (map[string]string, []string) {
	var envVars []models.EnvVar
	s.DB.Where("project_id = ?", projectID).Find(&envVars)
	envMap := make(map[string]string)
	var securedNames []string
	for _, ev := range envVars {
		val := ev.Value
		if ev.Secured && val != "" {
			dec, err := crypto.Decrypt(val, s.EncryptionKey)
			if err == nil {
				val = dec
				securedNames = append(securedNames, ev.Name)
			}
		}
		envMap[ev.Name] = val
	}
	return envMap, securedNames
}

// MaskSecuredInRequest replaces secured var values with "secret:***" in URL, headers, body
func MaskSecuredInRequest(url string, headers map[string]string, body string, envMap map[string]string, securedNames []string) (string, map[string]string, string) {
	type kv struct{ name, val string }
	var vals []kv
	for _, name := range securedNames {
		if v, ok := envMap[name]; ok && v != "" {
			vals = append(vals, kv{name, v})
		}
	}
	sort.Slice(vals, func(i, j int) bool { return len(vals[i].val) > len(vals[j].val) })

	maskedURL := url
	maskedBody := body
	for _, kv := range vals {
		maskedURL = strings.ReplaceAll(maskedURL, kv.val, "secret:***")
		maskedBody = strings.ReplaceAll(maskedBody, kv.val, "secret:***")
	}
	maskedHeaders := make(map[string]string)
	for k, v := range headers {
		maskedVal := v
		for _, kv := range vals {
			maskedVal = strings.ReplaceAll(maskedVal, kv.val, "secret:***")
		}
		maskedHeaders[k] = maskedVal
	}
	return maskedURL, maskedHeaders, maskedBody
}

// ExecuteAndSaveTest runs a single test and saves the result
func (s *ExecutionService) ExecuteAndSaveTest(test *models.TestRequest, scheduleID *uint) (*models.TestRun, error) {
	envMap, securedNames := s.LoadEnvMap(test.ProjectID)
	result := runner.ExecuteTest(test, envMap)

	maskedURL, maskedHeaders, maskedBody := MaskSecuredInRequest(
		result.RequestURL, result.RequestHeaders, result.RequestBody,
		envMap, securedNames,
	)

	arJSON, _ := json.Marshal(result.AssertionResults)
	headersJSON, _ := json.Marshal(maskedHeaders)
	status := "passed"
	if !result.Passed {
		status = "failed"
	}

	testRun := models.TestRun{
		TestRequestID:    test.ID,
		Status:           status,
		StatusCode:       result.StatusCode,
		ResponseBody:     result.ResponseBody,
		DurationMs:       result.DurationMs,
		ErrorMessage:     result.Error,
		AssertionResults: string(arJSON),
		RequestMethod:    result.RequestMethod,
		RequestURL:       maskedURL,
		RequestHeaders:   string(headersJSON),
		RequestBody:      maskedBody,
		ScheduleID:       scheduleID,
	}
	if err := s.DB.Create(&testRun).Error; err != nil {
		return nil, err
	}

	return &testRun, nil
}

// ExecuteAndSaveFlow runs a flow and saves results
func (s *ExecutionService) ExecuteAndSaveFlow(flowID uint, scheduleID *uint) (*models.FlowRun, error) {
	var flow models.Flow
	if err := s.DB.Preload("Steps", func(db *gorm.DB) *gorm.DB {
		return db.Order("order_num ASC")
	}).First(&flow, flowID).Error; err != nil {
		return nil, err
	}

	envMap, securedNames := s.LoadEnvMap(flow.ProjectID)

	flowRun := models.FlowRun{
		FlowID:     flow.ID,
		Status:     "running",
		ScheduleID: scheduleID,
	}
	if err := s.DB.Create(&flowRun).Error; err != nil {
		return nil, err
	}

	var totalDurationMs int64
	allPassed := true

	for _, step := range flow.Steps {
		var req models.TestRequest
		if err := s.DB.Preload("Assertions").First(&req, step.TestRequestID).Error; err != nil {
			continue
		}

		result := runner.ExecuteTest(&req, envMap)
		totalDurationMs += result.DurationMs

		maskedURL, maskedHeaders, maskedBody := MaskSecuredInRequest(
			result.RequestURL, result.RequestHeaders, result.RequestBody,
			envMap, securedNames,
		)

		status := "passed"
		if !result.Passed {
			status = "failed"
			allPassed = false
		}

		arJSON, _ := json.Marshal(result.AssertionResults)
		headersJSON, _ := json.Marshal(maskedHeaders)

		testRun := models.TestRun{
			TestRequestID:    req.ID,
			Status:           status,
			StatusCode:       result.StatusCode,
			ResponseBody:     result.ResponseBody,
			DurationMs:       result.DurationMs,
			ErrorMessage:     result.Error,
			AssertionResults: string(arJSON),
			RequestMethod:    result.RequestMethod,
			RequestURL:       maskedURL,
			RequestHeaders:   string(headersJSON),
			RequestBody:      maskedBody,
			ScheduleID:       scheduleID,
		}
		s.DB.Create(&testRun)

		// Extractions
		extractedData := make(map[string]interface{})
		for k, v := range step.Extractions {
			path, ok := v.(string)
			if !ok {
				continue
			}
			extractedValue := gjson.Get(result.ResponseBody, path)
			if extractedValue.Exists() {
				extractedData[k] = extractedValue.Value()
				if extractedValue.Type == gjson.String {
					envMap[k] = extractedValue.String()
				} else {
					envMap[k] = extractedValue.Raw
				}
			}
		}

		extractedBytes, _ := json.Marshal(extractedData)

		runStep := models.FlowRunStep{
			FlowRunID:     flowRun.ID,
			FlowStepID:    step.ID,
			TestRunID:     testRun.ID,
			Status:        status,
			ExtractedData: string(extractedBytes),
		}
		if err := s.DB.Create(&runStep).Error; err != nil {
			log.Printf("Failed to create flow run step: %v", err)
		}

		if !result.Passed {
			break
		}
	}

	if allPassed && len(flow.Steps) > 0 {
		flowRun.Status = "passed"
	} else if len(flow.Steps) == 0 {
		flowRun.Status = "passed"
	} else {
		flowRun.Status = "failed"
	}

	flowRun.DurationMs = totalDurationMs
	s.DB.Save(&flowRun)

	return &flowRun, nil
}
