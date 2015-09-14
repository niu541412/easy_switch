var newsPattern=/^http:\/\/news.baidu.com\/.*?\Wpage=([^&]+)/;
$(document).delegate('a','click',function(event){
	var link=this.href||'';
	var e=newsPattern.exec(link);
	if(e){
		event.preventDefault();
		this.style.color="purple";
		window.open(decodeURIComponent(e[1]));
	}
});