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
			// 跳过新版复习步骤
			SKIP_REVIEW_MODE : getStorageValue('SKIP_REVIEW_MODE', 0)
		};
	}

	window.setOption = function(option) {
		for (i in option) localStorage[i] = option[i];
	}
})();

if(typeof $ == 'function')
$(function() {
		var option = getOption();
		$('#limit').val(option.LENGTH_PER_QUERY);
		$('#skip').prop('checked', option.SKIP_REVIEW_MODE > 0);
		$('#save').click(function(){
			option.LENGTH_PER_QUERY = $('#limit').val();
			option.SKIP_REVIEW_MODE = $('#skip').prop('checked') ? 1 : 0;
			setOption(option);
			// Update status to let user know options were saved.
			var status = $("#status");
			status.html("Options Saved.");
			window.setTimeout(function() {
				status.html("");
			}, 750);
		});

});
