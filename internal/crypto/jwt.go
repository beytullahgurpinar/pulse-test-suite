package crypto

import (
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type Claims struct {
	UserID      uint   `json:"user_id"`
	WorkspaceID uint   `json:"workspace_id"`
	Email       string `json:"email"`
	Role        string `json:"role"`
	jwt.RegisteredClaims
}

func GenerateToken(userID, workspaceID uint, email, role, secret string) (string, error) {
	claims := Claims{
		UserID:      userID,
		WorkspaceID: workspaceID,
		Email:       email,
		Role:        role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * 7 * time.Hour)), // 1 week
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secret))
}

func VerifyToken(tokenString, secret string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		// Prevent algorithm confusion attacks (e.g. alg:none, RS256 with HMAC key)
		if token.Method.Alg() != "HS256" {
			return nil, errors.New("unexpected signing method")
		}
		return []byte(secret), nil
	})

	if err != nil {
		return nil, err
	}

	if claims, ok := token.Claims.(*Claims); ok && token.Valid {
		return claims, nil
	}

	return nil, errors.New("invalid token")
}
