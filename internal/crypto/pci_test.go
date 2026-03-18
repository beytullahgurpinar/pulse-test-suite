package crypto

import (
	"testing"
)

func TestMaskPCI(t *testing.T) {
	tests := []struct {
		name  string
		input string
		want  string
	}{
		{
			name:  "continuous card number",
			input: `card: 4111111111111111`,
			want:  `card: ****-****-****-1111`,
		},
		{
			name:  "grouped with dashes",
			input: `number: 4111-1111-1111-1111`,
			want:  `number: ****-****-****-1111`,
		},
		{
			name:  "grouped with spaces",
			input: `number: 4111 1111 1111 1111`,
			want:  `number: ****-****-****-1111`,
		},
		{
			name:  "JSON pan field",
			input: `{"card_number": "4111111111111111"}`,
			want:  `{"card_number": "****-****-****-1111"}`,
		},
		{
			name:  "JSON cvv field",
			input: `{"cvv": "123"}`,
			want:  `{"cvv": "***"}`,
		},
		{
			name:  "JSON cvc2 field",
			input: `{"cvc2": "456"}`,
			want:  `{"cvc2": "***"}`,
		},
		{
			name:  "invalid luhn — not masked",
			input: `number: 4111111111111112`,
			want:  `number: 4111111111111112`,
		},
		{
			name:  "random digits — not masked",
			input: `order_id: 1234567890123456`,
			want:  `order_id: 1234567890123456`,
		},
		{
			name:  "mastercard",
			input: `{"pan": "5500005555555559"}`,
			want:  `{"pan": "****-****-****-5559"}`,
		},
		{
			name:  "amex continuous",
			input: `token: 378282246310005`,
			want:  `token: ****-****-****-0005`,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := MaskPCI(tt.input)
			if got != tt.want {
				t.Errorf("\ninput: %s\ngot:   %s\nwant:  %s", tt.input, got, tt.want)
			}
		})
	}
}

func TestEncryptDecryptField(t *testing.T) {
	key := DeriveKey("test-secret")

	t.Run("roundtrip", func(t *testing.T) {
		original := `{"response":"hello","card":"4111111111111111"}`
		encrypted := EncryptField(original, key)
		if encrypted == original {
			t.Fatal("expected encrypted value to differ from original")
		}
		if len(encrypted) < 4 || encrypted[:4] != "enc:" {
			t.Fatalf("expected enc: prefix, got: %s", encrypted[:min(10, len(encrypted))])
		}
		decrypted := DecryptField(encrypted, key)
		if decrypted != original {
			t.Errorf("roundtrip failed:\ngot:  %s\nwant: %s", decrypted, original)
		}
	})

	t.Run("plaintext passthrough", func(t *testing.T) {
		plain := `{"legacy":"data"}`
		got := DecryptField(plain, key)
		if got != plain {
			t.Errorf("expected plaintext passthrough, got: %s", got)
		}
	})

	t.Run("empty value", func(t *testing.T) {
		if EncryptField("", key) != "" {
			t.Error("expected empty string to remain empty")
		}
	})
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

func TestLuhnCheck(t *testing.T) {
	valid := []string{
		"4111111111111111", // Visa test card
		"5500005555555559", // MC test card
		"378282246310005",  // Amex test card
		"6011111111111117", // Discover test card
	}
	for _, n := range valid {
		if !luhnCheck(n) {
			t.Errorf("expected valid luhn for %s", n)
		}
	}

	invalid := []string{
		"4111111111111112",
		"1234567890123456",
	}
	for _, n := range invalid {
		if luhnCheck(n) {
			t.Errorf("expected invalid luhn for %s", n)
		}
	}
}
