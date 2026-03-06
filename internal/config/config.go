package config

import (
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	MySQLHost          string
	MySQLPort          string
	MySQLUser          string
	MySQLPassword      string
	MySQLDatabase      string
	Port               string
	EncryptionKey      string // for encrypting secured env vars
	JWTSecret          string // for signing tokens
	GoogleClientID     string
	GoogleClientSecret string
	AppURL             string // for OAuth callback redirections
	GoogleRedirectURL  string // Optional override
}

func Load() (*Config, error) {
	_ = godotenv.Load()

	encKey := getEnv("ENCRYPTION_KEY", getEnv("SECRET_KEY", ""))
	if encKey == "" {
		encKey = "pulse-suite-secret-key-change-it" // fallback for dev
	}

	jwtSecret := getEnv("JWT_SECRET", encKey) // use encKey as default for backward compatibility

	appURL := getEnv("APP_URL", "http://localhost:8181")

	return &Config{
		MySQLHost:          getEnv("MYSQL_HOST", "localhost"),
		MySQLPort:          getEnv("MYSQL_PORT", "3306"),
		MySQLUser:          getEnv("MYSQL_USER", "root"),
		MySQLPassword:      getEnv("MYSQL_PASSWORD", "password"),
		MySQLDatabase:      getEnv("MYSQL_DATABASE", "pulse_db"),
		Port:               getEnv("PORT", "8181"),
		EncryptionKey:      encKey,
		JWTSecret:          jwtSecret,
		GoogleClientID:     getEnv("GOOGLE_CLIENT_ID", ""),
		GoogleClientSecret: getEnv("GOOGLE_CLIENT_SECRET", ""),
		AppURL:             appURL,
		GoogleRedirectURL:  getEnv("GOOGLE_REDIRECT_URL", ""),
	}, nil
}

func getEnv(key, defaultVal string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return defaultVal
}
