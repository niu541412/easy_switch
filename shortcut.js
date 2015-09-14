(function(){
	if(window.__shortcut__){return;}
	window.__shortcut__=true;
	var az="abcdefghijklmnopqrstuvwxyz";
	function keydown(e){
		var alt=e.altKey,ctrl=e.ctrlKey,shift=e.shiftKey;
		var keycode=e.keyCode;
		if(!alt&&!ctrl&&!shift)return;
		if(keycode>=48&&keycode<=57){
			keycode-=48;
		}else if(keycode>=65&&keycode<=90){
			keycode=az.charAt(keycode-65);
		}else{
			keycode=null;
		}
		if(keycode===null)return;
		var s="";
		if(ctrl)s+="ctrl+";
		if(alt)s+="alt+";
		if(shift)s+="shift+";
		s+=keycode;
		onShortcut(s);
	}
	function onShortcut(s){
		if(chrome.extension.sendMessage){
			chrome.extension.sendMessage({action:'shortcut',value:s});
		}
	}
	document.addEventListener("keydown",keydown,false);
})();



