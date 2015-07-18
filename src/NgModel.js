/*!
 * @license NgModel for AngularJS
 * (c) 2015 AyeCue
 * License: MIT
 * This is inspired by:
 * ExtJS modellayer (https://docs.sencha.com/extjs/5.1/5.1.0-apidocs/#!/api/Ext.data.Model),
 * ActiveRecord (http://github.com/bfanger/angular-activerecord)
 */
angular
    .module('NgModel', [])
    .factory('Batch', ['Namespace', function(Namespace){
        /**
         * @class Batch  Batch for AngularJS
         * @constructor
         * @param {NgModel} [model]  Model to use in batch.
         * @param {String} [operation]  Operation type like 'read' or 'delete'.
         * @param {Object} [options]  Extra options for batch.
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
             * @returns {Object}
             * @ignore
             */
            initOptions: function(){
                var me = this,
                    model = me.model,
                    options = me.options;

                options.data = options.data || {};

                if (model.appendData[me.operation]) {
                    angular.extend(options.data,model.getRequestData());

                    angular.forEach(model.notPersist,function(toExclude) {
                        Namespace.remove(options.data,toExclude,true);
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
             * @returns {Boolean}
             */
            isReading: function(){
                return this.operation === 'read';
            },

            /**
             * Get if batch is writing.
             *
             * @returns {Boolean}
             */
            isWriting: function(){
                return this.operation === 'create' || this.operation === 'update';
            },

            /**
             * Get options property of batch.
             *
             * @returns {Object}
             */
            get: function(){
                return this.options;
            }
        };

        return Batch;
    }])
    .factory('Namespace', ['$parse',function($parse) {
        return {
            /**
             * @property {String} delimiter  The object delimiter char.
             */
            delimiter: '.',

            /**
             * Set namespace in object.
             *
             * @param {Object} [obj]  Object you want to manipulate.
             * @param {String} [id]  Namespace for value you want to set.
             * @param {Mixed} [value]  Value for namespace.
             */
            set: function(obj,id,value){
                $parse(id).assign(obj,value);
            },

            /**
             * Get namespace in object.
             *
             * @param {Object} [obj]  Object you want to search through.
             * @param {String} [id]  Namespace for value you want to get.
             * @returns {Mixed}
             */
            get: function(obj,id){
                return $parse(id)(obj);
            },

            /**
             * Remove namespace in object.
             *
             * @param {Object} [obj]  Object you want to manipulate.
             * @param {String} [id]  Namespace for value you want to remove.
             * @param {Boolean} [autoDelete]  Auto delete parent if object is empty.
             */
            remove: function(obj,id,autoDelete){
                var me = this,
                    parts = id.split(me.delimiter),
                    last = parts.pop(),
                    pre = parts.join(me.delimiter),
                    root = me.get(obj,pre);

                root[last] = null;
                delete root[last];

                if (autoDelete) {
                    for (var key in root) {
                        if (root.hasOwnProperty(key)) {
                            return;
                        }
                    }

                    me.remove(obj,pre,autoDelete);
                }
            }
        };
    }])
    .factory('NgModel', [
        '$q',
        '$http',
        '$parse',
        '$interpolate',
        'Namespace',
        'Batch', 
        function($q,$http,$parse,$interpolate,Namespace,Batch) {
            /**
             * @class NgModel  NgModel for AngularJS
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
             * Process filters through data object. 
             *
             * @param {Object} [filters]  Collection of filters you want to apply.
             * @param {Object} [properties]  Object of the data.
             * @ignore
             */
            function applyFilters (filters, properties) {
                if (!filters) {
                    return;
                }

                angular.forEach(filters, function (filter,namespace) {
                    var value = Namespace.get(properties,namespace),
                        newValue; 

                    if (isDefined(value)) {
                        newValue = angular.isFunction(filter) ? filter(value) : $parse(namespace + '|' + filter)(properties);
                        Namespace.set(properties,namespace,newValue);
                    }
                });
            }

            /**
             * Check if value is defined. 
             *
             * @param {Mixed} obj  Value to check if it's defined.
             * @return Boolean
             * @ignore
             */
            function isDefined (obj) {
                return obj !== undefined && obj !== null;
            }

            /**
             * Extend properties to target class. 
             *
             * @param {Object} properties  Properties to extend.
             * @param {Mixed} to  Target class.
             * @ignore
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
             * @ignore
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
             * @ignore
             */
            function isStrict() {
                return !this;
            }

            /**
             * Create new child type of model.
             *
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
                sub.prototype = new extend();
                sub.$super = extend;
                
                extendTo(properties,sub.prototype);
                extendTo(extend,sub);
                extendTo(statics,sub);
                
                return sub;
            };

            /**
             * Fetch one record.
             *
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
            };

            /**
             * Call parent class method
             *
             * @param {Mixed} [args]  Arguments you need in the parent method.
             * @ignore
             */
            NgModel.callParent = callParent;

            NgModel.prototype = {
                /**
                 * @property {String} idProperty  The default namespace for the id property.
                 */
                idProperty: 'id',

                /**
                 * @property {Object} defaultData  The default propertiers of a record.
                 */
                defaultData: {},

                /**
                 * @property {Object} headers  The default headers for a request.
                 */
                headers: {},

                /**
                 * @property {String} resultRoot  The root namespace which contain the data.
                 */
                resultRoot: null,

                /**
                 * @property {String} url  The root namespace which contain the data.
                 */
                url: null,

                /**
                 * @property {Object} readFilters  Filter for data processing when reading.
                 */
                readFilters: null,

                /**
                 * @property {Object} writeFilters  Filter for data processing when writing.
                 */
                writeFilters: null,

                /**
                 * @property {Object} notPersist  Exclude non persit data from request.
                 */
                notPersist: [],

                /**
                 * @property {Object} actionMethods  Define your model crud schema.
                 */
                actionMethods: {
                    'create': 'POST',
                    'read': 'GET',
                    'update': 'PUT',
                    'delete': 'DELETE'
                },

                /**
                 * @property {Object} api  Specify certain url for certain operations (optional).
                 */
                api: {
                    'create': null,
                    'read': null,
                    'update': null,
                    'delete': null
                },

                /**
                 * @property {Object} appendData  Specify for which operation your model should append data to the request.
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
                        me.previousAttributes = function () {
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
                 * @param {String} [property]  Property to control.
                 * @returns {Boolean}
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
                 * @param {Object} [diff] An object to diff against, determining if there would be a change.
                 * @returns {Object}
                 */
                changedProperties: function (diff) {
                    var me = this,
                        current = diff || me.data,
                        changed = {},
                        previousAttributes = me.previousAttributes();

                    if (!isDefined(diff)) {
                        angular.forEach(previousAttributes,function(value,property){
                            if (!isDefined(value)) {
                                changed[property] = value;
                            }
                        });
                    }

                    angular.forEach(current,function(value,property){
                        if (current.hasOwnProperty(property) && !angular.equals(value, previousAttributes[property]) === false) {
                            changed[property] = value;
                        }
                    });

                    return changed;
                },

                /**
                 * Get the state of a property before the last change.
                 *
                 * @param {String} property  Property which you want to get.
                 * @returns {Mixed}
                 */
                previous: function (property) {
                    var me = this,
                        previous = me.previousAttributes();

                    return Namespace.get(previous,property);
                },

                /**
                 * Get the state of data before the last change.
                 *
                 * @returns {Object}
                 */
                previousAttributes: function () {
                    return {};
                },

                /**
                 * Read a record.
                 *
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
                            me.previousAttributes = function () {
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
                            me.previousAttributes = function () {
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
                 * @param {Object} [options]  Additonal request options.
                 * @return $q.promise
                 */
                destroy: function (options) {
                    var me = this,
                        deferred = $q.defer();

                    if (me.isNew()) {
                        deferred.resolve();
                        return deferred.promise;
                    }

                    this.sync('delete', this, options).then(function (response) {
                        me.response = response;
                        deferred.resolve();
                    }, function(response){
                        me.response = response;
                        deferred.reject(me);
                    });

                    return deferred.promise;
                },

                /**
                 * Sync a record.
                 *
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
                 * @param {Object} data  Raw request response data.
                 * @param {Object} [options]  Request options.
                 * @return {Object}
                 */
                parse: function (data, options) {
                    if (!isDefined(this.resultRoot)) {
                        return data;
                    }

                    return Namespace.get(data,this.resultRoot);
                },

                /**
                 * Indicates if record is new or not (important for save/update operation).
                 *
                 * @returns {Boolean}
                 */
                isNew: function () {
                    return this.getId() == null;
                },

                /**
                 * Getter for data property.
                 *
                 * @returns {Object}
                 */
                toJSON: function (){
                    return this.data;
                },

                /**
                 * Easy way to extend model to a scope.
                 *
                 * @param {Object} scope  Scope you want to add the model.
                 * @param {String} key  Property where you want to add the model to.
                 * @returns {NgModel}
                 */
                toScope: function(scope,key){
                    scope[key] = this.data;
                    return this;
                },

                /**
                 * Process data for batch (advised to extend as soon as you want extended data processing for requests).
                 *
                 * @returns {Object}
                 */
                getRequestData: function (){
                    return this.data;
                },

                /**
                 * Get id of record.
                 *
                 * @returns {Mixed}
                 */
                getId: function (){
                    return this.data[this.idProperty];
                },

                /**
                 * Change id of record.
                 *
                 * @param {Mixed} id  Id value for record.
                 * @returns {Mixed}
                 */
                setId: function (id){
                    this.data[this.idProperty] = id;
                    return this;
                },

                /**
                 * Getter for certain data properties.
                 *
                 * @param {String} key  Namespace for value you want to get.
                 * @return {Mixed}
                 */
                get: function (key){
                    return Namespace.get(this.data,key);
                },

                /**
                 * Setter for certain data properties.
                 *
                 * @param {String} key  Namespace for value you want to set.
                 * @param {Mixed} value  Value you want to set.
                 * @return {Mixed}
                 */
                set: function (key,value){
                    Namespace.set(this.data,key,value);
                    return this;
                },

                /**
                 * Create a new object which all filtered data wanted.
                 *
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
                 * @param {Mixed} [args]  Arguments you need in the parent method.
                 * @ignore
                 */
                callParent: callParent
            };

            return NgModel;
        }
    ]);