const MAX_TIMEOUT_ATTEMPTS = 3;
const MAX_TIMEOUT = 1000;


function main(client) {
	let timeoutAttempts = 0;
	let appliedClasses = [];
	let functions = new Set();

	function retrieveEvolvCssAsset(environment) {
		return document.querySelector('link[href *= "' + environment + '"][href *= "assets.css"]');
	}

	function retrieveEvolvJsAsset(environment) {
		return document.querySelector('script[src *= "' + environment + '"][src *= "assets.js"]');
	}

	const invokeFunctions = function () {
		const evolv = window.evolv;
		if (typeof evolv === 'undefined' || !evolv.javascript || !evolv.javascript.variants) {
			if (timeoutAttempts < MAX_TIMEOUT_ATTEMPTS) {
				setTimeout(invokeFunctions, MAX_TIMEOUT);
				timeoutAttempts++;
			} else {
				client.contaminate();
				console.warn('[Evolv]: Loading of variants timed out.');
			}
			return;
		}

		const promises = [];
		functions.forEach(function (key) {
			if (key in evolv.javascript.variants) {
				promises.push(evolv.javascript.variants[key]());
			}
		});

		Promise.all(promises)
			.then(function () {
				client.confirm()
			})
			.catch(function (err) {
				client.contaminate();
				console.warn('[Evolv]: An error occurred while applying a javascript mutation. ' + err);
			});
	};

	client.getActiveKeys('web').listen(function (keys) {
		const environment = client.environment;
		const cssAsset = retrieveEvolvCssAsset(environment);
		const jsAsset = retrieveEvolvJsAsset(environment);

		if (jsAsset && typeof Promise === 'undefined') {
			// Bail if a jsAsset is being used and Promise does not exist
			console.warn('[Evolv]: Javascript assets requested but no "Promise" implemented.');
			return;
		}

		const liveContexts = keys.map(function (key) {
			return 'evolv_'.concat(key.replace(/\./g, '_'));
		});

		appliedClasses.forEach(function (c) {
			document.documentElement.classList.remove(c);
		});

		if (cssAsset) {
			liveContexts.forEach(function (c) {
				document.documentElement.classList.add(c);
			});
			appliedClasses = liveContexts.slice();
		}

		if (jsAsset && liveContexts.length > 0) {
			liveContexts.forEach(function (key) {
				functions.add(key);
			});
			invokeFunctions();
		} else if (cssAsset && liveContexts.length > 0) {
			client.confirm();
		}
	});
}

function EvolvAssetManager(client) {
	client.context.set('web.url', window.location.href);

	// Expose client and context proprties
	Object.defineProperty(this, 'client', { get: function () { return client }});
	Object.defineProperty(this, 'context', { get: function () { return client.context }});

	main(client);
}

export default EvolvAssetManager;
