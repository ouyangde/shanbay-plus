(function() {
	var listener = function(){};
	sendMessage = function (data, callback) {
		if(typeof chrome != 'undefined') {
			return chrome.runtime.sendMessage(data, callback);
		}
		listener(data, null, callback);
	}

	onMessage = function (callback) {
		if(typeof chrome != 'undefined') {
			return chrome.runtime.onMessage.addListener(callback);
		}
		listener = callback;
	}

	shanbayplus_ajax = function (url, option) {
		if (typeof chrome != 'undefined') {
			return $.ajax(url, option);
		}
		option['url'] = url;
		option['method'] = option['type'];
		option['onerror'] = option['error'];
		var success = option['success'];
		option['onload'] = function(resp) {
		   	success(resp.responseText);
		}
		delete option['type'];
		delete option['error'];
		delete option['success'];
		return GM_xmlhttpRequest(option);
	}
})();
