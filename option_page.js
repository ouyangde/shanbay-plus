$(function() {
		var option = getOption();
		$('#limit').val(option.LENGTH_PER_QUERY);
		$('#skip').prop('checked', option.SKIP_REVIEW_MODE > 0);
		$('#vocabulary').val(option.SHOW_VOCABULARY_HELP);
		$('#vocabulary_timeout').val(option.SHOW_VOCABULARY_TIMEOUT);
		$('#save').click(function(){
			option.LENGTH_PER_QUERY = $('#limit').val();
			option.SKIP_REVIEW_MODE = $('#skip').prop('checked') ? 1 : 0;
			option.SHOW_VOCABULARY_HELP = $('#vocabulary').val();
			option.SHOW_VOCABULARY_TIMEOUT = $('#vocabulary_timeout').val();
			setOption(option);
			// Update status to let user know options were saved.
			var status = $("#status");
			status.html("Options Saved.");
			window.setTimeout(function() {
				status.html("");
			}, 750);
		});
		var request = window.indexedDB.open("shanbay_plus", 2);
		request.onerror = function(event) {
			//alert("Why didn't you allow my web app to use IndexedDB?!");
			console.log(event);
		};
		request.onsuccess = function(event) {
			g_db = event.target.result;
		};
		$("#exportButton").click(function(e) {
			//block click before ready
			var db = g_db;
			if(!db) return;
			e.preventDefault();
			var link = $("#exportLink");
			var area = $("#exportArea");
			area.html("");

			//Ok, so we begin by creating the root object:
			var data = {};
			var promises = [];
			for(var i=0; i<db.objectStoreNames.length; i++) {
				//thanks to http://msdn.microsoft.com/en-us/magazine/gg723713.aspx
				promises.push(

					$.Deferred(function(defer) {

						var objectstore = db.objectStoreNames[i];
						console.log(objectstore);
						if (objectStore != 'example') {
							defer.resolve({name:objectstore,data:""});
							return;
						}

						var transaction = db.transaction([objectstore], "readonly");  
						var content=[];

						transaction.oncomplete = function(event) {
							console.log("trans oncomplete for "+objectstore + " with "+content.length+" items");
							defer.resolve({name:objectstore,data:content});
						};

						transaction.onerror = function(event) {
						  // Don't forget to handle errors!
						  console.dir(event);
						};

						var handleResult = function(event) {  
						  var cursor = event.target.result;  
						  if (cursor) {  
							content.push({key:cursor.key,value:cursor.value});
							cursor.continue();  
						  }  
						};  

						var objectStore = transaction.objectStore(objectstore);
						objectStore.openCursor().onsuccess = handleResult;

					}).promise()

				);
			}

			$.when.apply(null, promises).then(function(result) {
				//arguments is an array of structs where name=objectstorename and data=array of crap
				//make a copy cuz I just don't like calling it argument
				var dataToStore = arguments;
				//serialize it
				var serializedData = JSON.stringify(dataToStore);
				area.text(serializedData);
				//The Christian Cantrell solution
				//document.location = 'data:Application/octet-stream,' + encodeURIComponent(serializedData);
				//link.attr("href",'data:Application/octet-stream,'+encodeURIComponent(serializedData));
				//link.text("download");
				//link.trigger("click");
				//fakeClick(link[0]);
			});
		});

});
function fakeClick(anchorObj) {
  if (anchorObj.click) {
    anchorObj.click()
  } else if(document.createEvent) {
    if(event.target !== anchorObj) {
      var evt = document.createEvent("MouseEvents"); 
      evt.initMouseEvent("click", true, true, window, 
          0, 0, 0, 0, 0, false, false, false, false, 0, null); 
      var allowDefault = anchorObj.dispatchEvent(evt);
      // you can check allowDefault for false to see if
      // any handler called evt.preventDefault().
      // Firefox will *not* redirect to anchorObj.href
      // for you. However every other browser will.
    }
  }
}
