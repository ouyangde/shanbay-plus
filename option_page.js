$(function() {
		var option = getOption();
		$('#limit').val(option.LENGTH_PER_QUERY);
		$('#skip').prop('checked', option.SKIP_REVIEW_MODE > 0);
		$('#vocabulary').prop('checked', option.SHOW_VOCABULARY_HELP > 0);
		$('#save').click(function(){
			option.LENGTH_PER_QUERY = $('#limit').val();
			option.SKIP_REVIEW_MODE = $('#skip').prop('checked') ? 1 : 0;
			option.SHOW_VOCABULARY_HELP = $('#vocabulary').prop('checked') ? 1 : 0;
			setOption(option);
			// Update status to let user know options were saved.
			var status = $("#status");
			status.html("Options Saved.");
			window.setTimeout(function() {
				status.html("");
			}, 750);
		});

});
