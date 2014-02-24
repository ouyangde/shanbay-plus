chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action == "getOptions")
    sendResponse(getOption());
  else
    sendResponse({});
});
