/*!
 * @license NgModel for AngularJS
 * (c) 2015 AyeCue
 * License: MIT
 * This is inspired by:
 * ExtJS modellayer (https://docs.sencha.com/extjs/5.1/5.1.0-apidocs/#!/api/Ext.data.Model),
 * ActiveRecord (http://github.com/bfanger/angular-activerecord)
 */
angular  //ignore in docs
    .module('NgModel', [])  //ignore in docs
    .factory('NgModel', [  //ignore in docs
        '$q',  //ignore in docs
        '$http',  //ignore in docs
        '$parse',  //ignore in docs
        '$interpolate',  //ignore in docs
        function($q,$http,$parse,$interpolate) { //ignore in docs
            /**
             * Batch for NgModel operations
             *
             * @class Batch
             * @constructor
             * @param {NgModel} model  Model to use in batch.
             * @param {String} operation  Operation type like 'read' or 'delete'.
             * @param {Object} [options]  Extra options for batch.
             * @private
             */
            function Batch(model,operation,options){
                var me = this;

                angular.extend(me,{
                    model: model,
                    operation: operation,
                    options: options || {}
                });

                me.initOptions();
            };

            Batch.prototype = {
                /**
                 * Initialize all options for batch.
                 *
                 * @method initOptions
                 * @return {Object}
                 * @private
                 */
                initOptions: function(){
                    var me = this,
                        model = me.model,
                        options = me.options;

                    options.data = options.data || {};

                    if (model.appendData[me.operation]) {
                        angular.extend(options.data,model.getRequestData());

                        angular.forEach(model.notPersist,function(toExclude) {
                            removeNamespace(options.data,toExclude,true);
                        });
                    }

                    if (!options.headers) {
                        options.headers = model.headers;
                    } else {
                        angular.extend(options.headers,model.headers);
                    }

                    if (!options.method) {
                        options.method = model.actionMethods[me.operation];
                    }

                    if (!options.url) {
                        options.url = model.buildUrl(me.operation,options);
                    }

                    return options;
                },

                /**
                 * Get if batch is reading.
                 *
                 * @method isReading
                 * @return {Boolean}
                 * @private
                 */
                isReading: function(){
                    return this.operation === 'read';
                },

                /**
                 * Get if batch is writing.
                 *
                 * @method isWriting
                 * @return {Boolean}
                 * @private
                 */
                isWriting: function(){
                    return this.operation === 'create' || this.operation === 'update';
                },

                /**
                 * Get options property of batch.
                 *
                 * @method get
                 * @return {Object}
                 * @private
                 */
                get: function(){
                    return this.options;
                }
            };

            /**
             * Process filters through data object. 
             *
             * @param {Object} [filters]  Collection of filters you want to apply.
             * @param {Object} [properties]  Object of the data.
             * @private
             */
            function applyFilters (filters, properties) {
                if (!filters) {
                    return;
                }

                angular.forEach(filters, function (filter,namespace) {
                    var value = getNamespace(properties,namespace),
                        newValue; 

                    if (isDefined(value)) {
                        newValue = angular.isFunction(filter) ? filter(value) : $parse(namespace + '|' + filter)(properties);
                        setNamespace(properties,namespace,newValue);
                    }
                });
            }

            /**
             * Check if value is defined. 
             *
             * @param {Mixed} obj  Value to check if it's defined.
             * @return Boolean
             * @private
             */
            function isDefined (obj) {
                return obj !== undefined && obj !== null;
            }

            /**
             * Extend properties to target class. 
             *
             * @param {Object} properties  Properties to extend.
             * @param {Mixed} to  Target class.
             * @private
             */
            function extendTo(properties,to){
                angular.forEach(properties,function(value,key){
                    if (!properties.hasOwnProperty(key)) {
                        return;
                    }
                    
                    if (angular.isFunction(value)) {
                        value.$previous = to[key];
                    }
                    
                    to[key] = value;
                });
            }

            /**
             * Call parent class method
             *
             * @param {Mixed} [args]  Arguments you need in the parent method.
             * @param {String} [method]  If you use strict mode you may have to this argument to define the method you want to call.
             * @return Mixed
             * @private
             */
            function callParent(args,method){
                var caller = this[method] || this.callParent.caller || arguments.callee.caller || arguments.caller;

                if (!caller) {
                    if (isStrict()) {
                        throw new Error('You are in strict mode use the second parameter in "callParent".');
                    }

                    throw new Error('The method "callParent" failed because cannot identify caller.');
                }

                return caller.$previous.apply(this,args);
            }

            /**
             * Check if strict
             *
             * @return Boolean
             * @private
             */
            function isStrict() {
                return !this;
            }

            /**
             * Set namespace in object.
             *
             * @param {Object} obj  Object you want to manipulate.
             * @param {String} id  Namespace for value you want to set.
             * @param {Mixed} value  Value for namespace.
             * @private
             */
            function setNamespace(obj,id,value){
                $parse(id).assign(obj,value);
            }

            /**
             * Get namespace in object.
             *
             * @param {Object} obj  Object you want to search through.
             * @param {String} id  Namespace for value you want to get.
             * @return {Mixed}
             * @private
             */
            function getNamespace(obj,id){
                return $parse(id)(obj);
            }

            /**
             * Remove namespace in object.
             *
             * @param {Object} obj  Object you want to manipulate.
             * @param {String} id  Namespace for value you want to remove.
             * @param {Boolean} [autoDelete]  Auto delete parent if object is empty.
             * @private
             */
            function removeNamespace(obj,id,autoDelete){
                var parts = id.split('.'),
                    last = parts.pop(),
                    pre = parts.join('.'),
                    root = getNamespace(obj,pre);

                root[last] = null;
                delete root[last];

                if (autoDelete) {
                    for (var key in root) {
                        if (root.hasOwnProperty(key)) {
                            return;
                        }
                    }

                    removeNamespace(obj,pre,autoDelete);
                }
            }

            /**
             * Modellayer for AngularJS
             *
             * @class NgModel
             * @constructor
             * @param {Object} [properties]  Start properties of record.
             */
            function NgModel (properties){
                var me = this;

                me.response = null;
                me.data = angular.extend({},me.defaultData,properties);
                me.initialize.apply(me, arguments);
            }

            /**
             * Create new child type of model.
             *
             * @method create
             * @static
             * @param {Object} [properties]  prototypeProperties for child model prototype.
             * @param {Object} [statics]  staticProperties for child model static properties.
             * @return {Function} Constructor
             */
            NgModel.create = function(properties,statics){
                var extend = this,
                    sub;

                properties = properties || {};
                statics = statics || {};
                
                if (properties.hasOwnProperty('constructor')) {
                    sub = properties.constructor;
                    properties.constructor = null;
                    delete properties.constructor;
                } else {
                    sub = function(){
                        return extend.apply(this,arguments);    
                    };
                }
                
                sub.constructor.$previous = extend.constructor;
                sub.prototype = Object.create(extend.prototype);
                sub.$super = extend;
                
                angular.extend(sub,extend);
                extendTo(properties,sub.prototype);
                extendTo(statics,sub);
                
                return sub;
            };

            /**
             * Fetch one record.
             *
             * @method fetchOne
             * @static
             * @param {Mixed} id
             * @param {Object} [options]  Additional options for request.
             * @return $q.promise
             */
            NgModel.fetchOne = function (id,options){
                var model = new this();
                model.setId(id);
                return model.fetch(options);
            };

            /**
             * Fetch collection of records.
             *
             * @method fetchAll
             * @static
             * @param {Object} [options]  Additional options for request.
             * @return $q.promise
             */
            NgModel.fetchAll = function (options){
                var model = this,
                    instance = new model(),
                    deferred = $q.defer();

                instance.sync('read',instance,options).then(function (response){
                    var data = instance.parse(response.data, options),
                        models, filters;

                    if (angular.isArray(data)) {
                        models = [];
                        filters = model.prototype.readFilters;

                        angular.forEach(data, function (item) {
                            applyFilters(filters, item);
                            models.push(new model(item));
                        });

                        deferred.resolve(models);
                    } else {
                        deferred.reject('Not a valid response, expecting an array');
                    }
                }, deferred.reject);

                return deferred.promise;
            };

            /**
             * Call parent class method
             *
             * @method callParent
             * @static
             * @private
             * @param {Mixed} [args]  Arguments you need in the parent method.
             * @return {Mixed}
             */
            NgModel.callParent = callParent;

            NgModel.prototype = {
                /**
                 * The default namespace for the id property.
                 *
                 * @property idProperty
                 * @type String
                 * @default "id"
                 */
                idProperty: 'id',

                /**
                 * The default propertiers of a record.
                 *
                 * @property defaultData
                 * @type Object
                 * @default {}
                 */
                defaultData: {},

                /**
                 * The default headers for a request.
                 *
                 * @property headers
                 * @type Object
                 * @default {}
                 */
                headers: {},

                /**
                 * The root namespace which contain the data.
                 *
                 * @property resultRoot
                 * @type String
                 * @default null
                 */
                resultRoot: null,

                /**
                 * The main request url.
                 *
                 * @property url
                 * @type String
                 * @default null
                 */
                url: null,

                /**
                 * Filter for data processing when reading.
                 *
                 * @property readFilters
                 * @type Object
                 * @default null
                 */
                readFilters: null,

                /**
                 * Filter for data processing when writing.
                 *
                 * @property writeFilters
                 * @type Object
                 * @default null
                 */
                writeFilters: null,

                /**
                 * Exclude non persit data from request.
                 *
                 * @property notPersist
                 * @type Array<String>
                 * @default []
                 */
                notPersist: [],

                /**
                 * Define your model crud schema.
                 *
                 * @property actionMethods
                 * @type Object
                 * @default {'create': 'POST','read': 'GET','update': 'PUT','delete': 'DELETE'}
                 */
                actionMethods: {
                    'create': 'POST',
                    'read': 'GET',
                    'update': 'PUT',
                    'delete': 'DELETE'
                },

                /**
                 * Specify certain url for certain operations (optional).
                 *
                 * @property api
                 * @type Object
                 * @default {'create': null,'read': null,'update': null,'delete': null}
                 */
                api: {
                    'create': null,
                    'read': null,
                    'update': null,
                    'delete': null
                },

                /**
                 * Specify for which operation your model should append data to the request.
                 *
                 * @property appendData
                 * @type Object
                 * @default {'create': true,'read': false,'update': true,'delete': false}
                 */
                appendData: {
                    'create': true,
                    'read': false,
                    'update': true,
                    'delete': false
                },

                /**
                 * Model initialization
                 *
                 * @method initialize
                 * @private
                 * @param {Object} [properties]  Start properties of record.
                 * @param {Object} [options]  Additional options for model.
                 */
                initialize: function (properties, options) {
                    var me = this;

                    options = options || {};

                    if (properties) {
                        if (options.parse) {
                            properties = me.parse(properties);
                        }
                        if (options.readFilters) {
                            applyFilters(me.readFilters, properties);
                        }

                        me.extend(properties);
                        me.previousProperties = function () {
                            return properties;
                        };
                    }

                    if (options.url) {
                        me.url = options.url;
                    }
                },

                /**
                 * Check if model data has changed since the last sync.
                 *
                 * @method hasChanged
                 * @param {String} [property]  Property to control.
                 * @return {Boolean}
                 */
                hasChanged: function (property) {
                    var me = this,
                        changed = me.changedProperties();

                    if (property) {
                        return property in changed;
                    }

                    for (var i in changed) {
                        return true;
                    }

                    return false;
                },

                /**
                 * Create object which contains all changed properties.
                 *
                 * @method changedProperties
                 * @param {Object} [diff] An object to diff against, determining if there would be a change.
                 * @return {Object}
                 */
                changedProperties: function (diff) {
                    var me = this,
                        current = diff || me.data,
                        changed = {},
                        previousProperties = me.previousProperties();

                    if (!isDefined(diff)) {
                        angular.forEach(previousProperties,function(value,property){
                            if (!isDefined(value)) {
                                changed[property] = value;
                            }
                        });
                    }

                    angular.forEach(current,function(value,property){
                        if (current.hasOwnProperty(property) && !angular.equals(value, previousProperties[property]) === false) {
                            changed[property] = value;
                        }
                    });

                    return changed;
                },

                /**
                 * Get the state of a property before the last change.
                 *
                 * @method previous
                 * @param {String} property  Property which you want to get.
                 * @return {Mixed}
                 */
                previous: function (property) {
                    var me = this,
                        previous = me.previousProperties();

                    return getNamespace(previous,property);
                },

                /**
                 * Get the state of data before the last change.
                 *
                 * @method previousProperties
                 * @return {Object}
                 */
                previousProperties: function () {
                    return {};
                },

                /**
                 * Read a record.
                 * 
                 * @method fetch
                 * @param {Object} [options]  Additonal request options.
                 * @return $q.promise
                 */
                fetch: function (options) {
                    var me = this,
                        deferred = $q.defer();

                    me.sync('read', me, options).then(function (response) {
                        var data = me.parse(response.data, options),
                            status = response.status,
                            success = status < 400;

                        me.response = response;

                        if (success && angular.isObject(data)) {
                            applyFilters(me.readFilters, data);
                            me.extend(data);
                            me.previousProperties = function () {
                                return data;
                            };
                            deferred.resolve(me);
                        } else if (success) {
                            deferred.resolve(me);
                        } else {
                            deferred.reject(me);
                        }
                    },function(response){
                        me.response = response;
                        deferred.reject(me);
                    });

                    return deferred.promise;
                },

                /**
                 * Save/Update a record.
                 *
                 * @method save
                 * @param {Object} [options]  Additonal request options.
                 * @return $q.promise
                 */
                save: function (options) {
                    var me = this,
                        operation = me.isNew() ? 'create' : 'update',
                        deferred = $q.defer();

                    me.sync(operation, me, options).then(function (response) {
                        var data = me.parse(response.data, options),
                            status = response.status,
                            success = status < 400;

                        me.response = response;

                        if (success && angular.isObject(data)) {
                            applyFilters(me.readFilters, data);
                            me.extend(data);
                            me.previousProperties = function () {
                                return data;
                            };
                            deferred.resolve(me);
                        } else if (success) {
                            deferred.resolve(me);
                        } else {
                            deferred.reject(me);
                        }
                    },function(response){
                        me.response = response;
                        deferred.reject(me);
                    });

                    return deferred.promise;
                },

                /**
                 * Delete a record.
                 *
                 * @method destroy
                 * @param {Object} [options]  Additonal request options.
                 * @return $q.promise
                 */
                destroy: function (options) {
                    var me = this,
                        deferred = $q.defer();

                    if (me.isNew()) {
                        deferred.resolve(me);
                        return deferred.promise;
                    }

                    me.sync('delete', me, options).then(function (response) {
                        me.response = response;
                        deferred.resolve(me);
                    }, function(response){
                        me.response = response;
                        deferred.reject(me);
                    });

                    return deferred.promise;
                },

                /**
                 * Sync a record.
                 *
                 * @method sync
                 * @private
                 * @param {String} operation  Indicates which operation should be done.
                 * @param {NgModel} model  Record used for request.
                 * @param {Object} [options]  Additonal request options.
                 * @return $q.promise
                 */
                sync: function (operation, model, options) {
                    var me = this,
                        batch = new Batch(model,operation,options);

                    options = batch.get();

                    if (batch.isWriting()) {
                        applyFilters(me.writeFilters,options.data);
                    }

                    return $http(options);
                },

                /**
                 * Put together url for request.
                 *
                 * @method buildUrl
                 * @private
                 * @param {String} operation  Indicates which operation should be done.
                 * @param {Object} [options]  Batch options.
                 * @return {String}
                 */
                buildUrl: function (operation,options){
                    var me = this,
                        url = me.api[operation] || me.url,
                        data = angular.extend({},me.data,options.data),
                        formatedUrl = $interpolate(url)(data);

                    if (!isDefined(data[me.idProperty])) {
                        return formatedUrl;
                    }

                    if (!isDefined(formatedUrl)) {
                        throw 'Implement this.buildUrl() or specify this.url';
                    }

                    return $interpolate('{{root}}{{end}}{{id}}')({
                        root: formatedUrl,
                        end: formatedUrl.charAt(formatedUrl.length - 1) === '/' ? '' : '/',
                        id: encodeURIComponent(data[me.idProperty])
                    });
                },

                /**
                 * Parse raw data from request response.
                 *
                 * @method parse
                 * @private
                 * @param {Object} data  Raw request response data.
                 * @param {Object} [options]  Request options.
                 * @return {Object}
                 */
                parse: function (data, options) {
                    if (!isDefined(this.resultRoot)) {
                        return data;
                    }

                    return getNamespace(data,this.resultRoot);
                },

                /**
                 * Indicates if record is new or not (important for save/update operation).
                 *
                 * @method isNew
                 * @return {Boolean}
                 */
                isNew: function () {
                    return !isDefined(this.getId());
                },

                /**
                 * Getter for data property.
                 *
                 * @method toJSON
                 * @return {Object}
                 */
                toJSON: function (){
                    return this.data;
                },

                /**
                 * Easy way to extend model to a scope.
                 *
                 * @method toScope
                 * @param {Object} scope  Scope you want to add the model.
                 * @param {String} key  Property where you want to add the model to.
                 * @return {NgModel}
                 */
                toScope: function(scope,key){
                    scope[key] = this.data;
                    return this;
                },

                /**
                 * Process data for batch (advised to extend as soon as you want extended data processing for requests).
                 *
                 * @method getRequestData
                 * @private
                 * @return {Object}
                 */
                getRequestData: function (){
                    return this.data;
                },

                /**
                 * Get id of record.
                 *
                 * @method getId
                 * @return {Mixed}
                 */
                getId: function (){
                    return this.data[this.idProperty];
                },

                /**
                 * Change id of record.
                 *
                 * @method setId
                 * @param {Mixed} id  Id value for record.
                 * @return {Mixed}
                 */
                setId: function (id){
                    this.data[this.idProperty] = id;
                    return this;
                },

                /**
                 * Getter for certain data properties.
                 *
                 * @method get
                 * @param {String} key  Namespace for value you want to get.
                 * @return {Mixed}
                 */
                get: function (key){
                    return getNamespace(this.data,key);
                },

                /**
                 * Setter for certain data properties.
                 *
                 * @method set
                 * @param {String} key  Namespace for value you want to set.
                 * @param {Mixed} value  Value you want to set.
                 * @return {Mixed}
                 */
                set: function (key,value){
                    setNamespace(this.data,key,value);
                    return this;
                },

                /**
                 * Create a new object which all filtered data wanted.
                 *
                 * @method range
                 * @param {Mixed} [...]  Property string you want to export or object with from/to information like {'myProp':'myNewProp'}.
                 * @return {Object}
                 */
                range: function (){
                    var me = this,
                        result = {};

                    angular.forEach(arguments,function(item){
                        var from = item,
                            to = item;

                        if (angular.isObject(item)) {
                            from = item.from;
                            to = item.to;
                        }

                        result[from] = me.data[to];
                    });

                    return result;
                },

                /**
                 * Easily extend the data object of your model.
                 *
                 * @method extend
                 * @param {Object} data  Data to extend.
                 * @return {NgModel}
                 */
                extend: function (data){
                    angular.extend(this.data,data);
                    return this;
                },

                /**
                 * Call parent class method
                 *
                 * @method callParent
                 * @private
                 * @param {Mixed} [args]  Arguments you need in the parent method.
                 * @return {Mixed}
                 */
                callParent: callParent
            };

            return NgModel; //ignore in docs
        } //ignore in docs
    ]); //ignore in docs