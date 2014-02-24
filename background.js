var cache = new Cache(300);

function getVocabulary(word, sendResponse) {
	var content = cache.getItem(word);
	if (content !== null) {
		sendResponse(content);
		return;
	}
	$.get('http://www.vocabulary.com/dictionary/definition.ajax?search='+word+'&lang=en', function(resp) {
		if (resp.match('wordPage')) {
			cache.setItem(word, resp, {
				expirationAbsolute: null,   
				expirationSliding: null
			}); 
			sendResponse(resp);
		}
		else if(resp.match('NORESULTS')) {
			// 无结果
			cache.setItem(word, "", {
				expirationAbsolute: null,   
				expirationSliding: null
			}); 
			sendResponse("");
		}
		else {
			// 其他
			sendResponse("");
		}
	});
	return true;
}
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action == "getOptions")
    sendResponse(getOption());
  else if (request.action == "getVocabulary")
    return getVocabulary(request.word,sendResponse);
  else
    sendResponse({});
});

