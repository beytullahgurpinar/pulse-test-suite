package crypto

import (
	"regexp"
	"strings"
	"unicode"
)

var (
	// Grouped card numbers: 4111-1111-1111-1111 or 4111 1111 1111 1111
	cardPatternGrouped = regexp.MustCompile(`\b(\d{4})[\s\-](\d{4})[\s\-](\d{4})[\s\-](\d{1,4})\b`)

	// Continuous card numbers: 4111111111111111 (13–19 digits starting with 3-6)
	cardPatternContinuous = regexp.MustCompile(`\b([3-6]\d{12,18})\b`)

	// JSON/form fields with card number names
	panFieldPattern = regexp.MustCompile(`(?i)("(?:card[_\-\s]?number|cardnumber|card[_\-\s]?no|pan|primary[_\-\s]?account[_\-\s]?number|account[_\-\s]?number|cc[_\-\s]?number|ccnum)"\s*:\s*)"([^"]+)"`)

	// JSON/form fields with CVV/CVC names
	cvvFieldPattern = regexp.MustCompile(`(?i)("(?:cvv2?|cvc2?|security[_\-\s]?code|card[_\-\s]?code|csc|verification[_\-\s]?code)"\s*:\s*)"([^"]+)"`)
)

// luhnCheck validates a numeric string using the Luhn algorithm.
func luhnCheck(number string) bool {
	sum := 0
	n := len(number)
	parity := n % 2
	for i, ch := range number {
		if ch < '0' || ch > '9' {
			return false
		}
		digit := int(ch - '0')
		if i%2 == parity {
			digit *= 2
			if digit > 9 {
				digit -= 9
			}
		}
		sum += digit
	}
	return sum%10 == 0
}

func stripNonDigits(s string) string {
	var b strings.Builder
	for _, r := range s {
		if unicode.IsDigit(r) {
			b.WriteRune(r)
		}
	}
	return b.String()
}

func maskCardDigits(digits string) string {
	if len(digits) < 4 {
		return "****-****-****-****"
	}
	return "****-****-****-" + digits[len(digits)-4:]
}

// MaskPCI detects and masks payment card data (PAN, CVV/CVC) in the given text.
//
// Card numbers are replaced with ****-****-****-XXXX (last 4 digits visible).
// CVV/CVC field values are replaced with ***.
//
// Detection uses two methods:
//  1. JSON field name matching (card_number, cvv, cvc, etc.)
//  2. Luhn-validated digit sequence matching
func MaskPCI(text string) string {
	// 1. Mask JSON fields with known PAN names
	text = panFieldPattern.ReplaceAllStringFunc(text, func(match string) string {
		parts := panFieldPattern.FindStringSubmatch(match)
		if len(parts) < 3 {
			return match
		}
		digits := stripNonDigits(parts[2])
		return parts[1] + `"` + maskCardDigits(digits) + `"`
	})

	// 2. Mask JSON fields with known CVV/CVC names
	text = cvvFieldPattern.ReplaceAllStringFunc(text, func(match string) string {
		parts := cvvFieldPattern.FindStringSubmatch(match)
		if len(parts) < 3 {
			return match
		}
		return parts[1] + `"***"`
	})

	// 3. Mask grouped card numbers (e.g. 4111 1111 1111 1111) with Luhn check
	text = cardPatternGrouped.ReplaceAllStringFunc(text, func(match string) string {
		digits := stripNonDigits(match)
		if !luhnCheck(digits) {
			return match
		}
		return maskCardDigits(digits)
	})

	// 4. Mask continuous card numbers (e.g. 4111111111111111) with Luhn check
	text = cardPatternContinuous.ReplaceAllStringFunc(text, func(match string) string {
		if !luhnCheck(match) {
			return match
		}
		return maskCardDigits(match)
	})

	return text
}
