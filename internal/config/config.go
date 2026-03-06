package config

import (
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	MySQLHost     string
	MySQLPort     string
	MySQLUser     string
	MySQLPassword string
	MySQLDatabase string
	Port          string
	EncryptionKey string // ENCRYPTION_KEY or SECRET_KEY - for encrypting secured env vars
}

func Load() (*Config, error) {
	_ = godotenv.Load()

	encKey := getEnv("ENCRYPTION_KEY", getEnv("SECRET_KEY", ""))
	if encKey == "" {
		encKey = "pulse-suite-secret-key-change-it" // fallback for dev
	}

	return &Config{
		MySQLHost:     getEnv("MYSQL_HOST", "localhost"),
		MySQLPort:     getEnv("MYSQL_PORT", "3306"),
		MySQLUser:     getEnv("MYSQL_USER", "root"),
		MySQLPassword: getEnv("MYSQL_PASSWORD", "password"),
		MySQLDatabase: getEnv("MYSQL_DATABASE", "pulse_db"),
		Port:          getEnv("PORT", "8181"),
		EncryptionKey: encKey,
	}, nil
}

func getEnv(key, defaultVal string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return defaultVal
}
