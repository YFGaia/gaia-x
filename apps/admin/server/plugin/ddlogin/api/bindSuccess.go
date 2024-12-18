package api

func bindHtml() string {
	html := `<html>
<body>
<h1>绑定成功</h1>
</body>
<script>
    setTimeout(()=>{
        window.location.href = window.location.origin
    },3000)
</script>

</html>
`
	return html
}
