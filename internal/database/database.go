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
	if err := db.AutoMigrate(
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
	); err != nil {
		return nil, err
	}
	log.Println("Database migration completed.")

	// Varsayılan proje ve mevcut testleri ata
	var count int64
	db.Model(&models.Project{}).Count(&count)
	if count == 0 {
		p := models.Project{Name: "Varsayılan Proje"}
		db.Create(&p)
		db.Model(&models.TestRequest{}).Where("project_id = 0").Update("project_id", p.ID)
	}

	return db, nil
}
