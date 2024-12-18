package response

// GetUserInfoRes 获取用户信息响应
type GetUserInfoRes struct {
	UserId   string `json:"user_id"`
	Username string `json:"username"`
	Name     string `json:"name"`
	Email    string `json:"email"`
	JwtToken string `json:"jwt_token"`
}
