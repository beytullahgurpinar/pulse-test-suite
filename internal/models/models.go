package models

import (
	"database/sql/driver"
	"encoding/json"
	"errors"
	"time"
)

// JSONMap for flexible JSON storage
type JSONMap map[string]interface{}

func (j JSONMap) Value() (driver.Value, error) {
	if j == nil {
		return nil, nil
	}
	return json.Marshal(j)
}

func (j *JSONMap) Scan(value interface{}) error {
	if value == nil {
		*j = nil
		return nil
	}
	bytes, ok := value.([]byte)
	if !ok {
		return errors.New("type assertion to []byte failed")
	}
	return json.Unmarshal(bytes, j)
}

// Workspace - Multi-tenant isolation
type Workspace struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	Name      string    `json:"name" gorm:"size:255;not null"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

// User - Platform users
type User struct {
	ID            uint      `json:"id" gorm:"primaryKey"`
	WorkspaceID   uint      `json:"workspaceId" gorm:"not null;index"`
	GoogleID      string    `json:"googleId" gorm:"size:255;uniqueIndex"`
	Email         string    `json:"email" gorm:"size:255;uniqueIndex;not null"`
	Name          string    `json:"name" gorm:"size:255"`
	Avatar        string    `json:"avatar" gorm:"size:255"`
	Role          string    `json:"role" gorm:"size:20;default:editor"` // admin, editor
	LastProjectID *uint     `json:"lastProjectId" gorm:"default:null"`  // last selected project
	Workspace     Workspace `json:"workspace" gorm:"foreignKey:WorkspaceID"`
	CreatedAt     time.Time `json:"createdAt"`
	UpdatedAt     time.Time `json:"updatedAt"`
}

// Invitation - Workspace davetiyesi
type Invitation struct {
	ID          uint      `json:"id" gorm:"primaryKey"`
	WorkspaceID uint      `json:"workspaceId" gorm:"not null;index"`
	Email       string    `json:"email" gorm:"size:255;not null"`
	Role        string    `json:"role" gorm:"size:20;default:editor"` // admin, editor
	Token       string    `json:"token" gorm:"size:64;uniqueIndex;not null"`
	Used        bool      `json:"used" gorm:"default:false"`
	CreatedAt   time.Time `json:"createdAt"`
}

// Project - Test grupları
type Project struct {
	ID          uint      `json:"id" gorm:"primaryKey"`
	WorkspaceID uint      `json:"workspaceId" gorm:"not null;index"`
	Name        string    `json:"name" gorm:"size:255;not null"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

// Category - Test kategorileri (klasörler)
type Category struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	ProjectID uint      `json:"projectId" gorm:"not null"`
	ParentID  *uint     `json:"parentId"` // Alt klasörler için
	Name      string    `json:"name" gorm:"size:255;not null"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

// EnvVar - Proje ortam değişkenleri ({{base_url}}, {{api_key}} vb.)
type EnvVar struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	ProjectID uint      `json:"projectId" gorm:"not null"`
	Name      string    `json:"name" gorm:"size:100;not null"`
	Value     string    `json:"value" gorm:"type:text"`
	Secured   bool      `json:"secured" gorm:"default:false"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

// TestRequest - API test definition
type TestRequest struct {
	ID         uint        `json:"id" gorm:"primaryKey"`
	ProjectID  uint        `json:"projectId" gorm:"not null"`
	CategoryID *uint       `json:"categoryId" gorm:"default:null;index"`
	Name       string      `json:"name" gorm:"size:255;not null"`
	Method     string      `json:"method" gorm:"size:10;default:GET"`
	URL        string      `json:"url" gorm:"type:text;not null"`
	Headers    JSONMap     `json:"headers" gorm:"type:json"`
	Body       string      `json:"body" gorm:"type:text"`
	Assertions []Assertion `json:"assertions" gorm:"foreignKey:TestRequestID;constraint:OnDelete:CASCADE"`
	CreatedAt  time.Time   `json:"createdAt"`
	UpdatedAt  time.Time   `json:"updatedAt"`
}

// Assertion - Expected response rules
type Assertion struct {
	ID            uint      `json:"id" gorm:"primaryKey"`
	TestRequestID uint      `json:"testRequestId" gorm:"not null"`
	Type          string    `json:"type" gorm:"size:50;not null"` // status, json_path, json_equals
	Key           string    `json:"key" gorm:"type:text"`         // JSON path: response.success, response.provider
	Operator      string    `json:"operator" gorm:"size:20"`      // eq, ne, contains, exists
	ExpectedValue string    `json:"expectedValue" gorm:"type:text"`
	CreatedAt     time.Time `json:"createdAt"`
	UpdatedAt     time.Time `json:"updatedAt"`
}

// TestRun - Test run result
type TestRun struct {
	ID               uint   `json:"id" gorm:"primaryKey"`
	TestRequestID    uint   `json:"testRequestId" gorm:"not null"`
	Status           string `json:"status" gorm:"size:20"` // passed, failed
	StatusCode       int    `json:"statusCode"`
	ResponseBody     string `json:"responseBody" gorm:"type:longtext"`
	DurationMs       int64  `json:"durationMs"`
	ErrorMessage     string `json:"errorMessage" gorm:"type:text"`
	AssertionResults string `json:"assertionResults" gorm:"type:json"`
	// Request snapshot - actual values sent (after env/placeholder substitution)
	RequestMethod  string `json:"requestMethod" gorm:"size:10"`
	RequestURL     string `json:"requestUrl" gorm:"type:text"`
	RequestHeaders string `json:"requestHeaders" gorm:"type:json"`
	RequestBody    string `json:"requestBody" gorm:"type:longtext"`
	// Multi-tenancy
	WorkspaceID uint `json:"workspaceId" gorm:"not null;index"`
	// Schedule tracking
	ScheduleID *uint     `json:"scheduleId,omitempty" gorm:"default:null"`
	CreatedAt  time.Time `json:"createdAt"`
}

// Schedule - Scheduled test execution
type Schedule struct {
	ID              uint       `json:"id" gorm:"primaryKey"`
	ProjectID       uint       `json:"projectId" gorm:"not null"`
	Name            string     `json:"name" gorm:"size:255;not null"`
	IntervalMins    int        `json:"intervalMins" gorm:"not null;default:60"` // interval in minutes
	Enabled         bool       `json:"enabled" gorm:"default:true"`
	RunAllTests     bool       `json:"runAllTests" gorm:"default:true"`             // true=all project tests, false=specific test
	TestRequestID   *uint      `json:"testRequestId,omitempty" gorm:"default:null"` // specific test (if runAllTests=false)
	FlowID          *uint      `json:"flowId,omitempty" gorm:"default:null"`        // run specific flow instead of single test
	WebhookURL      string     `json:"webhookUrl" gorm:"type:text"`                 // webhook for notifications
	NotifyOnFail    bool       `json:"notifyOnFail" gorm:"default:true"`            // send webhook on failure
	NotifyOnSuccess bool       `json:"notifyOnSuccess" gorm:"default:false"`        // send webhook on success
	LastRunAt       *time.Time `json:"lastRunAt"`
	NextRunAt       *time.Time `json:"nextRunAt"`
	CreatedAt       time.Time  `json:"createdAt"`
	UpdatedAt       time.Time  `json:"updatedAt"`
}

// Flow - Test akışı senaryolaması
type Flow struct {
	ID        uint       `json:"id" gorm:"primaryKey"`
	ProjectID uint       `json:"projectId" gorm:"not null"`
	Project   Project    `json:"project" gorm:"foreignKey:ProjectID"`
	Name      string     `json:"name" gorm:"size:255;not null"`
	CreatedAt time.Time  `json:"createdAt"`
	UpdatedAt time.Time  `json:"updatedAt"`
	Steps     []FlowStep `json:"steps" gorm:"foreignKey:FlowID;constraint:OnDelete:CASCADE"`
}

// FlowStep - Test akışı içindeki sıralı adımlar
type FlowStep struct {
	ID            uint `json:"id" gorm:"primaryKey"`
	FlowID        uint `json:"flowId" gorm:"not null"`
	TestRequestID uint `json:"testRequestId" gorm:"not null"`
	OrderNum      int  `json:"orderNum" gorm:"not null"`
	// Çıkarılacak değişkenler: {"mapped_token": "response.body.data.token"}
	Extractions JSONMap   `json:"extractions" gorm:"type:json"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

// FlowRun - Akışın çalışma geçmişi / ana raporu
type FlowRun struct {
	ID         uint   `json:"id" gorm:"primaryKey"`
	FlowID     uint   `json:"flowId" gorm:"not null;constraint:OnDelete:CASCADE"`
	Status     string `json:"status" gorm:"size:20"` // passed, failed, partial
	DurationMs int64  `json:"durationMs"`
	ScheduleID *uint  `json:"scheduleId,omitempty" gorm:"default:null"`
	// Multi-tenancy
	WorkspaceID uint          `json:"workspaceId" gorm:"not null;index"`
	CreatedAt   time.Time     `json:"createdAt"`
	Steps       []FlowRunStep `json:"steps" gorm:"foreignKey:FlowRunID;constraint:OnDelete:CASCADE"`
}

// FlowRunStep - Akış raporunun altındaki her bir adımı/detayı
type FlowRunStep struct {
	ID            uint      `json:"id" gorm:"primaryKey"`
	FlowRunID     uint      `json:"flowRunId" gorm:"not null"`
	FlowStepID    uint      `json:"flowStepId" gorm:"not null"`
	TestRunID     uint      `json:"testRunId" gorm:"not null"`
	TestRun       TestRun   `json:"testRun" gorm:"foreignKey:TestRunID"`
	Status        string    `json:"status" gorm:"size:20"`          // passed, failed
	ExtractedData string    `json:"extractedData" gorm:"type:json"` // O adımda yakalanan ve sonraki adımlara paslanan verinin logu
	CreatedAt     time.Time `json:"createdAt"`
}
