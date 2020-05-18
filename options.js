var ctrl,alt,shift,key;
function handleSave(){
	var ret=saveShortcut();
	if(!ret)return;

	saveGoogle();
	savePart();
	if(ret) alert('保存成功');
}
function byId(id){
	return document.getElementById(id);
}
function getShortcut(){
	var ret= localStorage.getItem('shortcut')||'alt+s';
	if(!/[a-z]/.test(ret.charAt(ret.length-1))){
		ret = ret.replace(/\+.*$/,'+s');
	}
	return ret;
}
// short cut格式为ctrl+key alt+shift+key
function saveShortcut(){
	localStorage.setItem('useshortcut', byId('useshortcut').checked?'1':'0');

	if(!ctrl.checked&&!alt.checked&&!shift.checked){
		alert("请选择控制键(ctrl/alt/shift)");
		return false;
	}
	var s="";
	if(ctrl.checked)s+="ctrl+";
	if(alt.checked)s+="alt+";
	if(shift.checked)s+="shift+";
	s+=key.value;
	localStorage.setItem('shortcut', s);
	return true;
}
function saveGoogle(){
	return;
	if(google_com.checked)localStorage.setItem('google', '.com');else localStorage.setItem('google', '.com.hk');
	if(byId('https_google').checked)localStorage.getItem('https_google', 'true');else localStorage.setItem('https_google', 'false');
}
function savePart(){
	var arr=[];
	var allSites=Sites.getAllSites();
	var name;
	for(var i=0; i<allSites.length; i++){
		var name=allSites[i].getName();
		arr.push({from:name,to:$('#'+name+'_to').val()});
	}
	Ways.saveWays(arr);
}
function init(){
	byId('save').onclick=handleSave;
	ctrl=byId("ctrl");
	alt=byId("alt");
	shift=byId("shift");
	key=byId("key");
	var shortcut=getShortcut();
	if(shortcut.indexOf('ctrl')!==-1)ctrl.checked=true;
	if(shortcut.indexOf('alt')!==-1)alt.checked=true;
	if(shortcut.indexOf('shift')!==-1)shift.checked=true;
	key.value=shortcut.charAt(shortcut.length-1);
	//use shortcut

	var useShortcut=localStorage.getItem('useshortcut')!=='0';
	byId('useshortcut').checked=useShortcut;

	//init ways
	initWays();

	initUserSites();
}
function initUserSites(){
	var bkg = chrome.extension.getBackgroundPage();
	bkg.console.log("hello: ");
	$('#usersites').html('');
	var html='';
	var userSites=Sites.getUserSites();
	userSites.forEach(function(userSite){
		var one=$('<div class="usersite"><img class="icon" src="'+userSite.getIcon()+'"/>'+userSite.getName()+'</div>');
		var del=$('<img data-site="'+userSite.getName()+'" class="delete" src="delete.png"></img>');
		one.append(del);
		$('#usersites').append(one);
	});
	//$('#usersites').delegate('.delete','click',function(){
	$('#usersites').on('click','.delete',function(){

		var siteName=$(this).attr('data-site');
		var r=confirm('删除自定义网站:'+siteName);
		if(r){
			var site=Sites.getSiteByName(siteName);
			Sites.removeUserSite(siteName);
			Ways.siteRemoved(site);
			//$(this).parent().remove();
			location.reload();
		}
	});

	$('#site_add').click(addUserSite);

}
function addUserSite(){
	var name=$('#site_name').val();
	var home=$('#site_home').val();
	var searchurl=$('#site_searchurl').val();
	if(!name||!home||!searchurl){
		alert('请补充网站信息!');
		return;
	}
	var q=searchurl.match(/(\w+)[\W_]%s/);
	if(!q){
		alert('请检查搜索地址，关键字部分用%s代替');
		return;
	}
	q=q[1];

	// 判断是否为firefox
  var isFirefox = typeof InstallTrigger !== 'undefined';
	var favicon_url;
  if(isFirefox) {
		var g_connection;
		$.ajax({
			method:"HEAD",
			async: false,
			url: "https://www.google.com"
		}).done(function() {
			g_connection = true;
		}).fail(function() {
			g_connection = false;
		})
		favicon_url = (g_connection && ('https://www.google.com/s2/favicons?domain_url='+home) || ('https://www.google.cn/s2/favicons?domain_url='+home));
	} else {
		favicon_url = 'chrome://favicon/'+home
	}
	//alert(favicon_url);*/
	var ps={
			name:name,
			icon:favicon_url,
			home:home,
			searchUrl:searchurl,
			q:q
	};
	if(getHost(ps.home)!=getHost(ps.searchUrl)){
		ps.matches=[getMatch(ps.home),getMatch(ps.searchUrl)];
	}
	Sites.addUserSite(ps);
	location.reload();
}
function getMatch(url){
	var host=getHost(url);
	return '//'+host.replace(/\./g,'\\.');
}
function getHost(url) {
	return url.match(/\/\/([\w\.]*)/)[1];
}
function getToSiteHtml(allSites,from,to){
	var name=from.getName()+'_to';
	var html= '<select id="'+name+'" name="'+name+'"><option value="" '+(to==null?'selected="selected"':'')+'>不切换</option>';
	for(var i=0; i<allSites.length; i++){
		html+='<option value="'+allSites[i].getName()+'">'+allSites[i].getName()+'</option>';
	}
	html+='</select>';
	var $html=$(html);
	if(to!=null){
		$html.find('[value='+to.getName()+']').attr('selected','selected');
		html=$html[0].outerHTML;
	}
	return html;
}
var BG=window.chrome.extension.getBackgroundPage();
var Ways=BG.Ways.getInstance();
var Sites=BG.Sites.getInstance();

function initWays(){
	var allSites=Sites.getAllSites();
	var html='';
	var way;
	var namelen;
	for(var i=0; i<allSites.length; i++){
		way=Ways.findWayBySite(allSites[i]);
		if (/.*[\u4e00-\u9fa5]+.*/.test(allSites[i].getName())) {
        //alert( "含有中文" );
				namelen=5;
    } else {
        //alert( "不含中文" );
				namelen=8;
    }
		var name=("　").concat(allSites[i].getName(),"　　　　").substr(0,namelen);
		html+='<div class="way"><img src="'+allSites[i].getIcon()+'" height="16" width="16"/><span class="from">'+name+'</span> ----> '+getToSiteHtml(allSites,allSites[i],way&&way.getTo())+'</div>';
	}
	$('#ways').html(html);
}
document.addEventListener("DOMContentLoaded",init,false);
