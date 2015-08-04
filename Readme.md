# NgModel for AngularJS

[![Build Status](https://travis-ci.org/ayecue/NgModel.png?branch=master)](https://travis-ci.org/ayecue/NgModel)

NgModel is a [ExtJS Model](https://docs.sencha.com/extjs/5.1/5.1.0-apidocs/#!/api/Ext.data.Model) inspired modellayer for [AngularJS](http://angularjs.org/).

NgModel is also inspired by [angular-activerecord](https://github.com/bfanger/angular-activerecord). This modellayer got some similarities since in the beginning I just extended [angular-activerecord](https://github.com/bfanger/angular-activerecord). But since I wanted some more advanced options I decided to rewrite the whole script without depending on [angular-activerecord](https://github.com/bfanger/angular-activerecord).

[API Documentation](http://rawgit.com/ayecue/NgModel/master/doc/index.html)


## Features

* create subclasses of models (OOP)
* supporting callParent method (exact same usage like in ExtJS)
* nearly everything is configurable like for example the api schema or resultRoot (by default it's set to the standart REST settings)
* fully customizable urls with automatic inserting of values from data object (like /myRestEndpoint/{{userId}}/success)
* data are not extended directly to the model class instead it got it's own data property
* read and write filtering through angular filters
* easy data exporting with range method
* no dependencies to other libraries (just AngularJS)
* nested data


## Examples

### Add NgModel module to your AngularJS Project
```js
module('myApp', ['NgModel']);
```

### Create subclass
```js
module('myApp').factory('Customer', function (NgModel) {
	return NgModel.create({

		//REST url to customer endpoint
		url: '/custmer/',

		//Default headers
		headers: {
			'ACCEPT-VERSION': '2.0.0'
		},

		//Optional possibility to extend your own functions
		buildUrl: function(){
			console.log('buildUrl');
			return this.callParent(arguments);
		}
	});
});
```

### Async model operations
```js
module('myApp').controller('CustomerCtrl', function ($scope, Customer, $document) {

	Customer.fetchOne(1).then(function (customer) { // Fetches '/customer/1'
		//expose customer data to scope with property name "customer"
		customer.toScope(scope,'customer');

		//change values in customer
		customer.set('name','John Doe');
		customer.set('age','30');

		//send changes to REST endpoint
		customer.save().then(function(){
			console.log('done');
		});
	});
});
```

### Advanced model
```js
module('myApp').factory('Sizes', function (NgModel) {
	return NgModel.create({

		//REST url to customer sizes endpoint
		url: '/engine/{{customerId}}/sizes',

		//Result root
		resultRoot: 'payload',

		//Default headers
		headers: {
			'ACCEPT-VERSION': '1.0.0'
		},

		//Default data of record
		defaultData: {
			'locale': 'en'
		}
	});
}).controller('SettingsCtrl',function($scope, Sizes){
	$scope.saveSizes = function(props){
		var sizes = new Sizes(props);

		//add customerId to sizes
		sizes.set('customerId',2);

		//send changes to REST endpoint /engine/2/sizes
		sizes.save();
	};
});
```


## Developer commands

Make sure you have all dev deps installed. Also I am using certain linux commands in "doc" and "build" so those commands won't probably work on windows.

Run tests:
```
npm run test
```

Rebuild documentation:
```
npm run doc
```

Minify NgModel:
```
npm run build
```