package api

import (
	"fmt"
)

func loginHtml(user, jwt string) string {
	html := `<html>
<body>
<h1>登录中，欢迎你：%s</h1>

</body>
<script>
    window.localStorage.setItem("token","%s")
    setTimeout(()=>{
        window.location.href = window.location.origin
    },3000)
</script>

</html>`
	return fmt.Sprintf(html, user, jwt)
}
