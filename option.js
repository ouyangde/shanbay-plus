(function(){
	function getStorageValue(key, defaultVal) {
		if (typeof(localStorage[key]) === 'undefined') {
			localStorage[key] = defaultVal;
		}
		else {
			defaultVal = parseInt(localStorage[key], 10);
		}
		return defaultVal;
	}
	window.getOption = function() {
		return {
			// 查词限制
			LENGTH_PER_QUERY : getStorageValue('LENGTH_PER_QUERY', 330),
			// 显示词汇助记
			SHOW_VOCABULARY_HELP : getStorageValue('SHOW_VOCABULARY_HELP', 1),
			// 跳过新版复习步骤
			SKIP_REVIEW_MODE : getStorageValue('SKIP_REVIEW_MODE', 0)
		};
	}

	window.setOption = function(option) {
		for (i in option) localStorage[i] = option[i];
	}
})();
