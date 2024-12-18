package api

import (
	"fmt"
)

func errHtml(err string) string {
	html := `<html>
<body>
<h1>%s</h1>

</body>
<script>
setTimeout(() = >{
window.location.href = window.location.origin
}, 3000)
</script>

</html>`
	return fmt.Sprintf(html, err)
}
