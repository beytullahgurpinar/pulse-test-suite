package crypto

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"errors"
	"io"
)

// DeriveKey hashes the input to produce a 32-byte key for AES-256
func DeriveKey(secret string) []byte {
	h := sha256.Sum256([]byte(secret))
	return h[:]
}

// Encrypt encrypts plaintext using AES-256-GCM with the given key
func Encrypt(plaintext string, key []byte) (string, error) {
	if len(key) != 32 {
		return "", errors.New("key must be 32 bytes")
	}
	block, err := aes.NewCipher(key)
	if err != nil {
		return "", err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}
	nonce := make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return "", err
	}
	ciphertext := gcm.Seal(nonce, nonce, []byte(plaintext), nil)
	return base64.StdEncoding.EncodeToString(ciphertext), nil
}

// Decrypt decrypts ciphertext encrypted with Encrypt
func Decrypt(ciphertextB64 string, key []byte) (string, error) {
	if len(key) != 32 {
		return "", errors.New("key must be 32 bytes")
	}
	ciphertext, err := base64.StdEncoding.DecodeString(ciphertextB64)
	if err != nil {
		return "", err
	}
	block, err := aes.NewCipher(key)
	if err != nil {
		return "", err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}
	nonceSize := gcm.NonceSize()
	if len(ciphertext) < nonceSize {
		return "", errors.New("ciphertext too short")
	}
	nonce, ciphertext := ciphertext[:nonceSize], ciphertext[nonceSize:]
	plaintext, err := gcm.Open(nil, nonce, ciphertext, nil)
	if err != nil {
		return "", err
	}
	return string(plaintext), nil
}

// EncryptField encrypts val with AES-256-GCM and prepends "enc:" prefix.
// Returns val unchanged if val is empty or encryption fails.
func EncryptField(val string, key []byte) string {
	if val == "" {
		return val
	}
	encrypted, err := Encrypt(val, key)
	if err != nil {
		return val
	}
	return "enc:" + encrypted
}

// DecryptField decrypts a field encrypted by EncryptField.
// If the value does not start with "enc:", it is returned as-is (plaintext legacy data).
func DecryptField(val string, key []byte) string {
	const prefix = "enc:"
	if len(val) <= len(prefix) || val[:len(prefix)] != prefix {
		return val
	}
	decrypted, err := Decrypt(val[len(prefix):], key)
	if err != nil {
		return val
	}
	return decrypted
}

// MaskSecuredValue returns a masked display string for secured values
// e.g. "secret:abc****" (first 3 chars visible) or "secret:****" if shorter
func MaskSecuredValue(value string) string {
	const prefix = "secret:"
	const visible = 3
	if len(value) <= visible {
		return prefix + "****"
	}
	return prefix + value[:visible] + "****"
}
