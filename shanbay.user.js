
function main(option) {


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
			addVocabularySample(word);
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
					showVocabularyResponse(word, response, pos - 1);
				}
			});
		});
	}
}

var g_expandVocabulary = false; // 默认情况不展开

function showVocabularyResponse(word, response, pos) {
	var content = $(response).find('.blurb');
	
	if (content.length) {
		$('#review-definitions .cndf .text').css({'color': '#f7f7f7','cursor':'pointer'}).click(function(){$(this).css({'color':'',cursor:''})});
	}
	
	if (!content.length && response.length < 10) {
		// 显示错误信息
		content = $('<span class="error" style="color:gray;cursor:pointer"></span>').text(response);
	}

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
		if (!g_expandVocabulary) {
			content.find('.long').hide();
			content.find('.sidebar').hide();
		}
		if (!pos) {
			$('#learning_word .word').children().eq(1).before(addReview);
		}
		else {
			$('#review .learning-detail-container').children().eq(pos).before(addReview);
		}

		var toggle = function() {
			g_expandVocabulary = !g_expandVocabulary;
			content.find('.long').toggle();
			content.find('.sidebar').toggle();
		}
		addReview.find('.expand span').click(toggle);
		addReview.find('.error').click(function() {
			addReview.remove();
			showVocabulary(word, true);
		});

		$.Shortcuts.stop();
		$.Shortcuts.empty();
		$.Shortcuts.add({
			type: 'up',
			mask: 'm',
			handler: toggle
		}).start();
	}
}

//-------------------vocabulary.com examples----------------------------
function addVocabularySample(word)
{
	var tab = $('<li><a class="ex-voc-box-tab" href="#ex-voc-box">Vocabulary例句</a></li>');
	var tab_content = $('<div class="tab-pane ex-group" id="ex-voc-box"><ol></ol></div>');
	$('#example-tab').append(tab);
	$('#example-tab').next().append(tab_content);
	tab.click(function() {
		showVocabularySample(tab_content);
	});
	tab_content.data('offset', 0);
	tab_content.data('word', word);
}

function showVocabularySample(container)
{
	var word = container.data('word'),
		offset = container.data('offset');
	if (!container.find('li').length) {
		sendMessage({
			action: "getVocabularyExamples",
			word: word,
			offset: offset
		}, function(data) {
			//data = JSON.parse(response);
			var ul = container.find('ol');
			if (data.result.sentences) {
				data.result.sentences.forEach(function(ele, i) {
					renderHTML(ele).append(link(ele)).appendTo(ul);
				});
				ul.find('li').mouseenter(function(e) {
					var btn = $('<div class="actions btn-group pull-right"><a class="btn btn-mini" href="javascript:void(0)">添加到自建例句</a></div>');
					$(e.currentTarget).append(btn);
					btn.click(function(e) {
						var li = $(e.currentTarget).parent();
						var tab = $('#example-tab').find('li a.ex-voc-box-tab').parent().prev().find('a');
						setTimeout(function() {
							tab[0].click();
							setTimeout(function() {
								var ori = li.find('.sentence').text();
								var trans = li.find('.source').text();
								$('#ex-create').find('#newex').val(ori);
								$('#ex-create').find('#newtrans').val(trans);
							}, 1);
						}, 1);
						/*
						var ori = li.find('.sentence').text();
						var trans = li.find('.source').text();
						getContentIdByWord(word, function(content_id) {
							addExample(ori, trans, content_id, function(){});
						});
						*/
					});
				}).mouseleave(function(e) {
					$(e.currentTarget).find('.actions').remove();
				});
			}
		});
	}
}

function addExample(ori, trans, content_id, callback)
{
	$.post('/api/v1/bdc/example/', {
		original: ori,
		translation: trans,
		vocabulary: content_id
	}, function(r) {
		callback(r);
	});
}

function getContentIdByWord(word, callback)
{
	$.getJSON('/api/v1/bdc/search/', {word:word}, function(r) {
		callback(r.data.content_id);
	});
}

function renderHTML(result) {
	var sent = $('<div class="sentence"/>');
	var str = result.sentence;
	var offsets = result.offsets;
	var last = 0;
	for (var i = 0; i < offsets.length; i += 2) {
		sent.append(document.createTextNode(str.substring(last, offsets[i])));
		sent.append($("<strong/>").text(str.substring(offsets[i], offsets[i + 1])));
		last = offsets[i + 1]
	}
	sent.append(document.createTextNode(str.substring(last)));
	return $("<li/>").append(sent)
}

function link(result) {
	var sourceLink = $('<a target="_blank" class="source"></a>');
	var $title = $("<span />").appendTo(sourceLink);
	if (result.volume.corpus.id == "GUT") {
		sourceLink.attr("href", "http://www.gutenberg.org/ebooks/" + result.volume.locator);
		$title.addClass("author").text(result.volume.author)
	} else {
		if (result.volume.corpus.id == "LIT") {
			$title.addClass("title").text(result.volume.title)
		} else {
			$title.addClass("corpus").text(result.volume.corpus.name);
			if (result.volume.datePublished) {
				$('<span class="date" />').text((new Date(Date.parse(result.volume.datePublished))).toDateString()).appendTo(sourceLink)
			}
		}
		if (result.volume.asin) {
			sourceLink.attr("href", "http://www.amazon.com/dp/" + result.volume.asin + "?tag=vocabularyc00-20")
		} else {
			if (result.volume.locator && result.volume.locator.indexOf("http") == 0) {
				sourceLink.attr("href", result.volume.locator)
			}
		}
	}
	return sourceLink
}

// 全自动创建单词书
$(function() {
	if (!$('.btn-add-new-unit-container').length) return;
	var container = $('<div><p style="color: #209E95; font-weight: bold;">批量添加格式：单词\\t例句\\t例句解释</p>'+
	'<p style="color: #209E95; font-weight: bold;">当前单元：<span></span></p></div>');
	var wordForm = $('<form action="/api/v1/wordlist/vocabulary/" method="post">'+
			'<textarea name="word"></textarea>'+
			'<input type="submit" class="btn btn-success" value="提交">'+
			'</form>'),
	notFound = $('<div class="hide"><h4>下列单词未找到</h4><ul></ul></div>'),
	dup = $('<div class="hide"><h4>下列单词已经存在</h4><ul></ul></div>'),
	example_failed = $('<div class="hide"><h4>下列单词例句添加失败</h4><ul></ul></div>'),
	notAdd = $('<div class="hide"><h4>框中剩余单词不予添加（数量限制？）</h4><ul></ul></div>');
	var cur_wordlist_id, cur_unit_name, cur_unit;

	container.append(wordForm).append(notFound).append(dup).append(notAdd).append(example_failed);
	$('.btn-add-new-unit-container').after(container);
	$('#wordbook-wordlist-container').delegate('.wordbook-create-candidate-wordlist', 'click', function(evt) {
		cur_unit = $(evt.currentTarget);
		cur_wordlist_id = cur_unit.find('a.btn-update-unit-info').attr('unit-id');
		container.find("span").text(cur_unit.find(".wordbook-wordlist-name").text());
		$(evt.currentTarget).siblings().removeClass("highlight").end().addClass("highlight");
		cur_unit.after(container);
	});
	wordForm.submit(function() {
		var form = $(this);
		var textarea = form.find('textarea');
		var url = form.attr('action');
		var lines = $.trim(textarea.val());
		var line, word;
		if (!cur_wordlist_id) {
			alert('请先选中单元');
			return false;
		}
		if (lines.length == 0) {
			textarea.focus();
			return false;
		}


		form.find('input[type=submit]').hide();
		lines = lines.split("\n");
		textarea.focus().val('');
		notFound.hide().find('ul').empty();
		notAdd.hide().find('ul').empty();
		dup.hide().find('ul').empty();
		example_failed.hide().find('ul').empty();

		var finish_add = function(lines) {
			if (lines.length) {
				notAdd.show();
			}
			form.find('input[type=submit]').show();
			textarea.focus().val(lines.join('\n'));
		}
		var add_next = function(lines) {
			if (lines.length == 0) {
				return finish_add(lines);
			}

			line = lines.shift();
			var arr = line.split("\t");
			var word = arr[0];
			$.post(url, {word: word, id: cur_wordlist_id}, function(res) {
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
						lines.unshift(line);
						return finish_add(lines);
					}
				}
				else {
					var num_el = cur_unit.find('.wordbook-create-wordlist-title span').parent();
					var num_str = num_el.html().replace(/\d+/, function(n) {
						return parseInt(n) + 1;
					});
					num_el.html(num_str);
					if (arr.length > 2) {
						return addExample(arr, res.data.vocabulary.id, lines);
					}
				}
				add_next(lines);
			});
		}
		var addExample = function(arr, voc_id, lines) {
			$.post('/wordlist/vocabulary/example/add/', {
				vocabulary_id:voc_id,
				wordlist_id:cur_wordlist_id,
				original:arr[1],
				translation:arr[2]
			}, function(data) {
				if (data.status != 0) {
					example_failed.show().find('ul').append('<li>'+line+'</li>');
					return add_next(lines);
				}
				sendMessage({
					action: "putExample",
					word: voc_id,
					example_id: data.example.id
				}, function(result) {
					add_next(lines);
				});
			});
		}
		add_next(lines);
		return false;
	});
});

// 批量加词
$(function() {
if (!$('#add-learnings-form').length) return;
var form = $('#add-learnings-form').clone();
$('#add-learnings-form').replaceWith(form);
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
        } else {
            $('.learnings').hide();
        }
        textarea.focus().val(remains);
    })
    return false;
});
});