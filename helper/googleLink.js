var lastCheckUrl;
function adjustLink() {
	if (lastCheckUrl == window.location.href)
		return;
	var count = 0;
	$('#ires h3 a').each(function(index) {
		if ((this.getAttribute("onmousedown") + "").indexOf("rwt(") > -1) {
			this.removeAttribute("onmousedown");
			count++;
		}
	});
	if (count > 4) {
		lastCheckUrl = window.location.href;
	}
}
$().ready(function() {
	setInterval(adjustLink, 500);
});
