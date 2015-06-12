var g_cache = new Cache(300);
var g_requests = {};
var g_db = null;
var DB_EXPIRE = 1000 * 3600 * 24 * 30;
function getVocabulary(word, sendResponse) {
	var content = g_cache.getItem(word);
	if (content !== null) {
		sendResponse(content);
		return;
	}

	// 进行并发控制，防止多次请求
	if (typeof g_requests[word] != 'undefined') {
		g_requests[word].push(sendResponse);
		return true;
	}

	g_requests[word] = [ sendResponse ];

	getVocabularyViaDB(word, function(resp, store) {
		if (store) {
			g_cache.setItem(word, resp, {
				expirationAbsolute: null,   
				expirationSliding: null
			}); 
		}
		g_requests[word].forEach(function(send) {
			send(resp);
		});
		delete g_requests[word];
	});

	return true;

}

var request = window.indexedDB.open("shanbay_plus", 2);
request.onerror = function(event) {
	//alert("Why didn't you allow my web app to use IndexedDB?!");
	console.log(event);
};
request.onsuccess = function(event) {
	g_db = event.target.result;
};
request.onupgradeneeded = function(event) {
   // 更新对象存储空间和索引 .... 
	var db = event.target.result;
	var objectStore;
	if (!db.objectStoreNames.contains("vocabulary")) {
		objectStore = db.createObjectStore("vocabulary", { keyPath: "word" });
		objectStore.createIndex("time", "time", { unique: false });
	}	
	objectStore = db.createObjectStore("example", { keyPath: "word" });
}

function putExample(word, example_id) {
	var objectStore = g_db.transaction(["example"], "readwrite").objectStore("example");
	objectStore.put({word: word, example_id: example_id});
}

function getExamples(callback) {
	var objectStore = g_db.transaction(["example"], "readwrite").objectStore("example");
	objectStore.openCursor.onsuccess = function(event) {
		var cursor = event.target.result;
		if (cursor) {
			callback(cursor.value);
			cursor.continue();
		}
	};
}
function clearExpire() {
	var objectStore = g_db.transaction(["vocabulary"], "readwrite").objectStore("vocabulary");
	var index = objectStore.index('time');
	index.openKeyCursor(IDBKeyRange.upperBound(new Date().getTime() - DB_EXPIRE)).onsuccess = function(event) {
		var cursor = event.target.result;
		if (cursor) {
			// cursor.key, cursor.value.time
			objectStore.delete(cursor.primaryKey);
			cursor.continue();
		}
	};
}

// 通过DB请求一个单词，查不到的话会通过网络继续查找
function getVocabularyViaDB(word, callback) {
	var viaWeb = function() {
		getVocabularyViaWeb(word, function(resp, store) {
			if (store) {
				// store via sql
				g_db.transaction(["vocabulary"], "readwrite").objectStore("vocabulary").put({
					word: word,
					content: resp,
					time: new Date().getTime()
				});
			}
			callback(resp, store);
		});
	}

	var result = g_db.transaction(["vocabulary"]).objectStore("vocabulary").get(word);

	result.onsuccess = function(event) {
		if (typeof event.target.result != 'undefined') {
			// 过期检查
			if (new Date().getTime() - event.target.result.time < DB_EXPIRE) {
				callback(event.target.result.content, true);
				return;
			}
		}
		viaWeb();
	};
	result.onerror = function(event) {
		viaWeb();
	};
	return;
	// if get via db
}


// 通过网络请求一个单词
function getVocabularyViaWeb(word, callback) {
	var opt = getOption();
	var timeout = opt['SHOW_VOCABULARY_TIMEOUT'];
	shanbayplus_ajax('http://www.vocabulary.com/dictionary/definition.ajax?search='+word+'&lang=en', {
		'type': 'GET',
		'timeout': timeout,
		'error': function() {
			callback('查询超时', false);
		},
		'success': function(resp) {
			if (resp.match('wordPage')) {
				callback(resp, true);
			}
			else if(resp.match('NORESULTS')) {
				// 明确的无结果
				callback('', true);
			}
			else {
				// 其他
				callback('查询出错', false);
			}
		}
	});
}

function getVocabularyExamples(word, offset, callback) {
	var opt = getOption();
	var timeout = opt['SHOW_VOCABULARY_TIMEOUT'];
	shanbayplus_ajax('http://corpus.vocabulary.com/api/1.0/examples.json', {
		data: {
			query: word,
			maxResults: 24,
			startOffset: offset,
			filter: 0
	    },
		'type': 'GET',
		'timeout': timeout,
		'error': function() {
			callback('{}');
		},
		'success': function(resp) {
			callback(resp);
		}
	});
	return true;
}

onMessage(function(request, sender, sendResponse) {
  if (request.action == "getOptions") {
    sendResponse(getOption());
  }
  else if (request.action == "getVocabulary") {
    return getVocabulary(request.word,sendResponse);
  }
  else if (request.action == "getVocabularyExamples") {
	// must return a value, if not immediately send a response.
    return getVocabularyExamples(request.word, request.offset, sendResponse);
  }
  else if (request.action == "putExample") {
    putExample(request.word, request.example_id);
    sendResponse({});
  }
  else if (request.action == 'getExample') {
	sendResponse(examples[request.word]);
  }
  else {
    sendResponse({});
  }
});
