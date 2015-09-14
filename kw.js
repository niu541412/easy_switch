/**
 * 有的任务需要和页面交互，但是这种交互或存在不确定性（消息广播,页面内交互）
 * 为了保证任务会被执行，创建此类
 * @param callback
 *            回调方法
 * @returns {TimeLimitTask}
 */
function TimeLimitTask(callback) {
	this.finished = false;
	this.realCallback = callback;
	var self = this;
	window.setTimeout(function() {
		self.callback();
	}, 200);
}
TimeLimitTask.prototype.callback = function(selection) {
	if (this.finished)
		return;
	this.realCallback.apply(window, arguments);
	this.finished = true;
}
/**
 * 获取选中项
 * 
 * @param callback
 *            回调方法 callback(selection)
 */
function getSelection(callback) {
	var task = new TimeLimitTask(callback);
	window._selectionTask = task;
	var code = 'var selection=window.getSelection().toString()||"";'
	+'chrome.runtime.sendMessage({action: "getselection",selection:selection});';
	chrome.tabs.executeScript({
		code : code
	});
}

function getInput(callback) {
	var task = new TimeLimitTask(callback);
	window._inputTask = task;
	var code = 'var inputs=document.querySelectorAll("input[type=text],input:not([type])");'
			+ 'var maxsize=100,i=0,size,input;'
			+ 'for(;i<inputs.length; i++){size=inputs[i].clientWidth*inputs[i].clientHeight; if(size>maxsize){maxsize=size;input=inputs[i];}}'
			+ 'chrome.runtime.sendMessage({action: "getinput",value:input&&input.value});';
	chrome.tabs.executeScript({
		code : code
	});
}
function getKeywordFromUrl(url,q){
	if(url.substr(0,4)!=='http')return '';
	var m=null;
	if(q){
		m=url.match(new RegExp('\\W(?:'+q+'\\W)([^&\\/?=]*)'));
	}
	!m&&(m = url.match(/[\/\-?&#!_](?:q|p|keyword|keywords|word|wd|kw|key|query|wiki)[=_\/\-]([^&\/?=]*)/));
	!m&&(m = url.match(/[\/\-?&#!_](?:search\/)([^&\/?=]*)/));
	if (m) {	
		try{
			return decodeURIComponent(m[1]);
		}catch(err){
		};
	}
	return '';
}
function getKeyword(callback,q){
	chrome.tabs.getSelected(null, function(tab) {
		getInput(function(keyword){
			callback(keyword||getKeywordFromUrl(tab.url,q));
		});
	});	
}

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
	if (request.action == "getinput") {
		window._inputTask && window._inputTask.callback(request.value);
		window._inputTask = null;
	} else if (request.action == "getselection") {
		window._selectionTask
				&& window._selectionTask.callback(request.selection);
		window._selectionTask = null;
	}
});
