cat userscript_head >shanbay_plus.user.js
echo -n 'GM_addStyle('\' >>shanbay_plus.user.js
cat style.css | xargs echo -n >>shanbay_plus.user.js
echo \'');' >>shanbay_plus.user.js
cat js/jquery-1.7.1.min.js js/jquery.shortcuts.js js/lru_cache.js env.js option.js background.js shanbay.user.js>>shanbay_plus.user.js
