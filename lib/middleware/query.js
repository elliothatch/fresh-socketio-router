var qs = require('qs');

module.exports = function query(options) {
	var opts = Object.create(options || null);
	var queryparse = qs.parse;

	if (typeof options === 'function') {
		queryparse = options;
		opts = undefined;
	}

	if (opts !== undefined) {
		if (opts.allowDots === undefined) {
			opts.allowDots = false;
		}

		if (opts.allowPrototypes === undefined) {
			opts.allowPrototypes = true;
		}
	}

	return function query(req, res, next){
		if (!req.query) {
			var val = req.url;
			var questionMarkIndex = val.indexOf('?');
			if(questionMarkIndex !== -1) {
				val = val.substring(questionMarkIndex + 1);
			}
			req.query = queryparse(val, opts);
		}

		next();
	};
};
