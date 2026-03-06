package database

import (
	"fmt"
	"log"

	"github.com/beytullahgurpinar/pulse-test-suite/internal/config"
	"github.com/beytullahgurpinar/pulse-test-suite/internal/models"

	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

func Connect(cfg *config.Config) (*gorm.DB, error) {
	dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?charset=utf8mb4&parseTime=True&loc=Local",
		cfg.MySQLUser, cfg.MySQLPassword, cfg.MySQLHost, cfg.MySQLPort, cfg.MySQLDatabase)

	db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{})
	if err != nil {
		return nil, err
	}

	// Auto migration - creates tables if not exist, applies schema changes
	log.Println("Database migration starting...")
	// Auto migration - creates tables if not exist, applies schema changes
	log.Println("Database migration starting...")
	if err := db.AutoMigrate(
		&models.Workspace{},
		&models.User{},
		&models.Project{},
		&models.Category{},
		&models.EnvVar{},
		&models.TestRequest{},
		&models.Assertion{},
		&models.TestRun{},
		&models.Schedule{},
		&models.Flow{},
		&models.FlowStep{},
		&models.FlowRun{},
		&models.FlowRunStep{},
		&models.Invitation{},
	); err != nil {
		return nil, err
	}
	log.Println("Database migration completed.")

	// Ensure default workspace exists
	var ws models.Workspace
	if err := db.First(&ws).Error; err != nil {
		// No workspace found, create one
		ws = models.Workspace{Name: "General Workspace"}
		db.Create(&ws)
	}

	// Update existing data if they have workspace_id = 0
	db.Model(&models.Project{}).Where("workspace_id = 0").Update("workspace_id", ws.ID)
	db.Model(&models.TestRun{}).Where("workspace_id = 0").Update("workspace_id", ws.ID)
	db.Model(&models.FlowRun{}).Where("workspace_id = 0").Update("workspace_id", ws.ID)

	// Ensure atleast one project exists
	var pCount int64
	db.Model(&models.Project{}).Count(&pCount)
	if pCount == 0 {
		p := models.Project{Name: "Sample Project", WorkspaceID: ws.ID}
		db.Create(&p)
		db.Model(&models.TestRequest{}).Where("project_id = 0").Update("project_id", p.ID)
	}

	return db, nil
}
