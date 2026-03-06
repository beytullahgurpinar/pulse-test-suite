package runner

import (
	"math/rand"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/go-faker/faker/v4"
	"github.com/google/uuid"
)

// Placeholder map: placeholder name -> generator function
var placeholderGenerators = map[string]func() string{
	"guid":       func() string { return uuid.New().String() },
	"uuid":       func() string { return uuid.New().String() },
	"firstName":  func() string { return faker.FirstName() },
	"lastName":   func() string { return faker.LastName() },
	"fullName":   func() string { return faker.FirstName() + " " + faker.LastName() },
	"email":      func() string { return faker.Email() },
	"phone":      func() string { return faker.Phonenumber() },
	"creditCard": func() string { return faker.CCNumber() },
	"currency":   func() string { return faker.Currency() },
	"amount":     func() string { return formatAmount(rand.Float64()*990+10) },
	"timestamp":  func() string { return strconv.FormatInt(time.Now().Unix(), 10) },
	"date":       func() string { return time.Now().Format("2006-01-02") },
	"datetime":   func() string { return time.Now().Format(time.RFC3339) },
}

func formatAmount(amount float64) string {
	return strconv.FormatFloat(amount, 'f', 2, 64)
}

// PlaceholderPattern matches {{placeholder}} or {{placeholder:arg}}
var placeholderPattern = regexp.MustCompile(`\{\{([a-zA-Z0-9_]+)(?::([^}]*))?\}\}`)

// ProcessPlaceholders replaces {{placeholder}} in body with random values.
func ProcessPlaceholders(s string) string {
	return ProcessWithEnv(s, nil)
}

// ProcessWithEnv önce {{name}} env değişkenleriyle değiştirir, sonra random placeholders uygular.
func ProcessWithEnv(s string, envVars map[string]string) string {
	return placeholderPattern.ReplaceAllStringFunc(s, func(match string) string {
		submatches := placeholderPattern.FindStringSubmatch(match)
		if len(submatches) < 2 {
			return match
		}
		name := strings.TrimSpace(submatches[1])
		nameLower := strings.ToLower(name)

		// 1. Env değişkeni varsa kullan
		if envVars != nil {
			if v, ok := envVars[name]; ok {
				return v
			}
			if v, ok := envVars[nameLower]; ok {
				return v
			}
		}

		// 2. Random placeholder (guid, email vb.)
		if gen, ok := placeholderGenerators[nameLower]; ok {
			return gen()
		}
		return match
	})
}

// GetPlaceholderList returns available placeholders for UI
func GetPlaceholderList() []string {
	list := make([]string, 0, len(placeholderGenerators))
	for k := range placeholderGenerators {
		list = append(list, k)
	}
	return list
}
