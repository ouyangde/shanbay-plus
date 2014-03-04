
function main(option) {

// -------------------------------------------------------查词窗口
speak = function(r) {// 直接发用户首选的音
	play_mp3(r.data.audio);
};

// ---------------------------------------------批量添加
$('#add-learnings .instruction').append('<font color="blue">已解除10个词的限制(每次依然仅提交10个，但多出的词会保留在文本框内，以备再次提交)</font>');
$('#add-learnings-form').unbind('submit').submit(function() {
    var form = $(this);
    var textarea = form.find('textarea');
    var url = form.find('actions').text();
    var words = $.trim(textarea.val());
    form.find('.msg').hide();
    if (words.length == 0) {
        $('#error1').show();
        textarea.focus();
        return false;
    }
	var wordsArr = words.split('\n');
	var remains = '';
	if (wordsArr.length > 10) {
		remains = wordsArr.slice(10).join('\n');
		words = wordsArr.slice(0, 10).join('\n');
	}

    form.find('input[type=submit]').hide();
    form.find('.loading').show();
    $.getJSON(url, {words: words}, function(data) {
        form.find('input[type=submit]').show();
        form.find('.loading').hide();
        if (data.result > 0) {
            $('#error2').html(data.note).show();
            return false;
        }
        var notfound_words = data.notfound_words;
        if (notfound_words.length > 0) {
            $('.notfounds').show();
            $('.notfounds ul').html('');
            $.each(notfound_words, function(k, word) {
                $('.notfounds ul').append($('#added-failed_tmpl').tmpl({word: word}));
            });
        } else {
            $('.notfounds').hide();
        }
        var learning_dicts = data.learning_dicts;
        if (learning_dicts.length > 0) {
            $('.learnings').show();
            $('.learnings ul').html('');
            $.each(learning_dicts, function(k, learning) {
				var item = $('#added-learning_tmpl').tmpl({id: learning.id,pronunciation: learning.pronunciation,content: learning.content,has_audio: learning.has_audio,definition: learning.definition,uk_audio: learning.uk_audio,us_aduio: learning.us_audio});
				item.find('.definition').hide();
                $('.learnings ul').append(item);
				$.getJSON('/api/v1/bdc/search/?word='+learning.content,function(r){
					if (r.data.retention > 0) {
						var retentionEle = $(''+
'<div><div class="retention-progress" style="width: 200px;float: left;">'+
  '<div class="retention-reviewed" style="width: 0%"> <div class="bar" style="width: 100%;">0</div> </div>'+
  '<div class="retention-left"> <div class="bar" style="width: 100%;"></div> </div>'+
'</div><button style="margin-left: 10px;">我忘了</button> </div>'+
							'');
						item.append(retentionEle);
						retentionEle.find('.retention-reviewed').css({
							width:Math.min(r.data.retention*100/r.data.target_retention,100)+'%'
						}).find(".bar").text(r.data.retention);
						retentionEle.find('button').click(function(e){
							$.ajax({
								type:"PUT",
								url:"/api/v1/bdc/learning/"+r.data.learning_id+"/",
								data:{retention:1},
								success:function() {
									retentionEle.remove();
									item.find('.definition').show();
							}});
						});
					}
					else {
						item.find('.definition').show();
					}
				});
            });
            $('.speaker').click(function() {
                if (auto_play_mode == 2)
                    var audio_url = $(this).parent().attr('uk_audio');
                else
                    var audio_url = $(this).parent().attr('us_audio');
                play_mp3(audio_url);
            });
        } else {
            $('.learnings').hide();
        }
        textarea.focus().val(remains);
    })
    return false;
});

// ----------------------------------阅读查词限制.

var reader_nav = $('.reader-nav');
if (option.LENGTH_PER_QUERY>0 && reader_nav.length) {
	reader_nav.append('<span style="position:relative;left:50px;">剩余查词：<b class="query-number" style="font-size:20px;color:#ec4272"></b></span>');
	var old_parse = Word.prototype.parse;
	var queryed = {};
	Word.prototype.parse = function(response) {
		var queryNum = $('.reader-nav').find('.query-number').text();
		if (response.status_code == 0 && !(data.content in queryed)) {
			$('.reader-nav').find('.query-number').text(queryNum-1);
			queryed[data.content] = 1;
		}
		return old_parse.apply(this, arguments);
	};

	var lastLength = 0;
	var lisenerID = setInterval(function(){
		if (app.article && app.article.attributes.data) {
			// option.LENGTH_PER_QUERY: 多少个查一次
			var length = app.article.attributes.data.length;
			if (length != lastLength) {
				lastLength = length;
				var totalNum = Math.ceil(length / option.LENGTH_PER_QUERY);
				reader_nav.find('.query-number').text(totalNum);
			}
			//clearInterval(lisenerID);
		}
	},2000);
}// end of 查词限制

// ---------------------------------------单词书
if ($('#to_add_vocabulary').length) {
	var wordForm = $('<p style="color: #209E95; font-weight: bold;">或使用下面的批量添加</p>'+
			'<form action="/api/v1/wordlist/vocabulary/" method="post">'+
			'<textarea name="word"></textarea>'+
			'<input type="submit" class="btn btn-success" value="提交">'+
			'</form>'),
	notFound = $('<div class="hide"><h4>下列单词未找到</h4><ul></ul></div>'),
	dup = $('<div class="hide"><h4>下列单词已经存在</h4><ul></ul></div>'),
	notAdd = $('<div class="hide"><h4>下列单词不予添加（数量限制？）</h4><ul></ul></div>');

	$('#to_add_vocabulary').after(notAdd).after(dup).after(notFound).after(wordForm);

	wordForm.submit(function() {
		var form = $(this);
		var textarea = form.find('textarea');
		var url = form.attr('action');
		var words = $.trim(textarea.val());
		var wordlist_id = $('#wordlist-id').html();
		var word;
		if (words.length == 0) {
			textarea.focus();
			return false;
		}

		form.find('input[type=submit]').hide();
		words = words.split('\n');
		textarea.focus().val('');
		notFound.hide().find('ul').empty();
		notAdd.hide().find('ul').empty();
		dup.hide().find('ul').empty();

		var finish_add = function(words) {
			words.forEach(function(val){
				notAdd.show().find('ul').append('<li>'+val+'</li>');
			});
			form.find('input[type=submit]').show();
		}
		var add_next = function(words) {
			if (words.length == 0) {
				return finish_add(words);
			}

			word = words.shift();
			$.post(url, {word: word, id: wordlist_id}, function(res) {
				if (res.status_code != 0) {
					// 没找到
					if (res.status_code == 404) {
						notFound.show().find('ul').append('<li>'+word+'</li>');
					}
					else if (res.msg.match("存在")) {
					   	// 单词已经存在
						dup.show().find('ul').append('<li>'+word+'</li>');
					}
					// 其他原因
					else if (true) {
						words.unshift(word);
						return finish_add(words);
					}
				}
				else {
					var html = $('#vocab-entry').tmpl(res.data);
					$('table tbody').prepend(html);
					trigger_add_example_modal();
					trigger_edit_definition_modal();
					enable_delete_button();
					update_wordlist_num_vocab(1);
				}
				add_next(words);
			});
		}
		add_next(words);
		return false;
	});
}// end of 单词书

// ---------------------------------------跳过新版步骤
if (option.SKIP_REVIEW_MODE > 0 && typeof ReviewView != 'undefined') {
	ReviewView.prototype.render_detail = function(prev_mode, result) {
		stop_spin();
		var review_detail_view = new ReviewDetailView({model: this.model,review_view: this,prev_mode: prev_mode,result: result});
		review_detail_view.bind('next', this.next, this);
		review_detail_view.bind('prev', this.prev, this);
		if (this.options.mode == 'learning') {
			$('.progress-box').hide();
		}
		if (G.forget_num) {
			review_detail_view.known_word();
		}
	};
}

}// end of main 整个main将被注入

// 获取选项后注入到主页面
sendMessage({
  action: "getOptions"
}, function(response) {
  var script = document.createElement("script");
  var option = JSON.stringify(response);
  script.textContent = "(" + main.toString() + ")(" + option + ");//@ sourceURL=shanbay_plus.js"; 
  document.body.appendChild(script);
});
/*
  var script = document.createElement("script");
  var option = JSON.stringify(getOption());
  script.textContent = "(" + main.toString() + ")(" + option + ");//@ sourceURL=shanbay_plus.js"; 
  document.body.appendChild(script);
*/

var word_trigger = {};
var curword = '';
// 监视#review的变动
var target = document.querySelector('#review');
if (target) {
	var observer = new MutationObserver(function(mutations) {
		// 预加载
		var word = $('#current-learning-word').text();
		if (word) {
			curword = word;
			showVocabulary(word, true);
			return;
		}
		word = $('#preview h1').eq(0).text();
		if (word.length && !word_trigger[word]) {
			word_trigger[word] = 1;
			console.log("show vocabulary, trigger");
			showVocabulary(word, false);
		}
	});
	observer.observe(target, { childList: true });
}

//------------------------------------ 显示助记信息
function showVocabulary(word, show) {
	if (word.length) {
		sendMessage({
			action: "getOptions"
		}, function(option) {
			var pos = option.SHOW_VOCABULARY_HELP;
			if (pos <= 0) return;
			sendMessage({
				action: "getVocabulary",
				word: word
			}, function(response) {
				console.log("show vocabulary, response");
				if (show && word == curword) {
					showVocabularyResponse(response, pos - 1);
				}
			});
		});
	}
}

function showVocabularyResponse(response, pos) {
	var content = $(response).find('.blurb');
	if (true) {
		var readMore = content.find(".readMore");
		if (readMore.length) {
			readMore.attr('href', 'http://www.vocabulary.com' + readMore.attr('href'));
			readMore.attr('target', '_blank');
		}
		var addReview = $(
				'<div id="shanbayplus_add_review" class="row">'+
				'<div class="span1"><h6 class="pull-right">助记</h6></div>'+
				'<div class="span9"><div class="well" style="overflow:hidden">'+
				'<div class="span6" style="margin-left:0px;"></div>'+
				'<div class="expand" style="text-align:right"><span style="color:#209e85;cursor:pointer;" title="快捷键：m">展开/收起</span></div>'+
				'</div></div></div>'
				);
		addReview.find('.span6').append(content);
		content.find('.long').hide();
		content.find('.sidebar').hide();
		if (!pos) {
			$('#learning_word .word').children().eq(1).before(addReview);
		}
		else {
			$('#review .learning-detail-container').children().eq(pos).before(addReview);
		}

		var toggle = function() {
			content.find('.long').toggle();
			content.find('.sidebar').toggle();
		}
		addReview.find('.expand span').click(toggle);

		$.Shortcuts.stop();
		$.Shortcuts.empty();
		$.Shortcuts.add({
			type: 'up',
			mask: 'm',
			handler: toggle
		}).start();
	}
}
