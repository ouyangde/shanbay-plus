// ==UserScript==
// @name           Shanbay Plus
// @description    查词界面增加美式发音,删除单词;批量添加单词增强;单词书创建增强;查词限制
// @version        0.7
// @author         unknown
// @namespace      http://shanbay.com/
// @include        http://www.shanbay.com/*
// ==/UserScript==

GM_addStyle('.icon.del{cursor:pointer;position:absolute;cursor: pointer;padding: 10px 10px; right: 6px;top:14px; background: url(http://qstatic.shanbay.com/static/img/icons.png) no-repeat -68px -38px; }'); 

function main(option) {

	/*
function getStorageValue(key, defaultVal) {
	if (typeof(localStorage[key]) === 'undefined') {
		localStorage[key] = defaultVal;
	}
	else {
		defaultVal = parseInt(localStorage[key], 10);
	}
	return defaultVal;
}
*/

// -------------------------------------------------------查词窗口
$('#search-result-title-tmpl').text('<div class="word-container"> <span class="word">${content}</span> {{if pronunciation}} <span class="pronunciation">[${pronunciation}]</span> {{/if}} <span class="icon speaker uk"></span> <span class="icon speaker us"></span></div>');

search_word = function(word) {
    var matched_pattern = word.match(/[\w- ]+/);
    if (!matched_pattern) {
        var title = $('#no_search_tmpl').tmpl().html();
        $('.navbar-search').attr('data-original-title', title);
        $('.navbar-search').popover({placement: 'bottom',trigger: "manual"}).popover('show');
        return;
    }
    $('.navbar-search').attr('data-original-title', TEXTS["loading"]).attr('data-content', '');
    show_popup();
    if (word == '' || word.length < 2) {
        return;
    }
    $.getJSON('/api/v1/bdc/search/?word=' + word, function(r) {
        show_result(r, word);
        $('.popover .uk').click(function(e) {
            speak(r);
            return false;
        });
        $('.popover .us').click(function(e) {
			play_mp3(r.data.us_audio);
            return false;
        });
		if (r.data.learning_id) {
			$('.popover .us').after('<span class="icon del"></span>');
			$('.popover .del').click(function(e) {
				$.ajax({type:"DELETE",url:"/api/v1/bdc/learning/"+r.data.learning_id+"/", 'success':function(){
					$('.popover .del').remove();
					$('.popover .add').remove();
				}});
				return false;
			});
		}
        $('#add-word').click(function(e) {
            add_word(e, r.data);
            return false;
        });
        $('.add .forget').click(function(e) {
            forget(e, r);
            return false;
        });
    });
}

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
	// backbone非常烂，竟然还在用
	Word = Backbone.Model.extend({
		urlRoot: '/api/v1/bdc/search/',
		parse: function(response) {
			data = response.data;
			var queryNum = $('.reader-nav').find('.query-number').text();
			if (response.status_code == 0 && queryNum > 0) {
				data.result = 0;
				g_variations_words[this.get('word')] = data.content;
				g_variations_words[data.content] = data.content;
				g_words_definitions[data.content] = data;
				if (!(data.content in g_words_variations)) {
					g_words_variations[data.content] = [data.content];
					$('.reader-nav').find('.query-number').text(queryNum-1);
				}
				push_unique(g_words_variations[data.content], this.get('word'));
				this.set('word', data.content);
			} else {
				data.result = 1;
				data.note = response.msg;
			}
			return data;
		}
	});
	var lastLength = 0;
	var lisenerID = setInterval(function(){
		if (app.article && app.article.attributes.data) {
			// 500个查一次
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

}// end of main

chrome.runtime.sendMessage({
  action: "getOptions"
}, function(response) {
  var script = document.createElement("script");
  var option = JSON.stringify(response);
  script.textContent = "(" + main.toString() + ")(" + option + ");//@ sourceURL=shanbay_plus.js"; 
  document.body.appendChild(script);
});