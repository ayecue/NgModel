describe("NgModel", function() {
	"use strict";

	beforeEach(function () {
		module('NgModel');
	});


	var $httpBackend, NgModel;

	beforeEach(inject(function($injector) {
		$httpBackend = $injector.get('$httpBackend');
		NgModel = $injector.get('NgModel');
	}));

	afterEach(function() {
		$httpBackend.verifyNoOutstandingExpectation();
		$httpBackend.verifyNoOutstandingRequest();
	});

	var createBasicModel = function () {
		var Model = NgModel.create({
			url: '/resources'
		});
		return new Model();
	};

	it("initialize", function() {
		var Model = NgModel.create({
			initialize: function() {
				this.one = 1;
				this.callParent(arguments,'initialize');
			}
		});
		var model = new Model();
		expect(model.one).toBe(1);
	});

	it("initialize with parsed attributes", function() {
		var model = new NgModel({
			value: 1
		});
		model.set('value',model.get('value') + 1);
		expect(model.get('value')).toBe(2);
	});

	it("save", function() {
		$httpBackend.expectPOST('/resources', '{"title":"Henry V "}').respond('{"id": 1, "title": "Henry V"}');
		var model = createBasicModel();
		model.set('title',"Henry V ")

		model.save().then(function (result) {
			expect(result).toBe(model);
			expect(model.get('id')).toBe(1);
			expect(model.get('title')).toBe('Henry V');
		});
		$httpBackend.flush();
	});

	it("delete", function() {
		$httpBackend.expectDELETE('/resources/1').respond('');
		var model = createBasicModel();
		model.setId(1);
		model.destroy().then(function(){
			// no expectations
		});
		$httpBackend.flush();
	});

	it('fetchOne', function () {
		var Model = NgModel.create({
			url: '/resources/'
		});
		$httpBackend.expectGET('/resources/1').respond( {id: 1, name: 'Test'});
		Model.fetchOne(1).then(function (model) {
			expect(model.get('id')).toBe(1);
			expect(model.get('name')).toBe('Test');
		});
		$httpBackend.flush();
	 });
});