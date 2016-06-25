var mockPackage = require('../mocks/mockPackage');
var Dgeni = require('dgeni');
var path = require('canonical-path');
var _ = require('lodash');

describe('readTypeScriptModules', function () {
  var dgeni, injector, processor;

  beforeEach(function () {
    dgeni = new Dgeni([mockPackage()]);
    injector = dgeni.configureInjector();
    processor = injector.get('readTypeScriptModules');
    processor.basePath = path.resolve(__dirname, '../mocks/readTypeScriptModules');
  });

  describe('exportDocs', function () {
    it('should provide the original module if the export is re-exported', function () {
      processor.sourceFiles = ['publicModule.ts'];
      var docs = [];
      processor.$process(docs);

      var exportedDoc = docs[1];
      expect(exportedDoc.originalModule).toEqual('privateModule');
    });

    it('should include exported abstract classes', function () {
      processor.sourceFiles = ['publicModule.ts'];
      var docs = [];
      processor.$process(docs);

      var exportedDoc = docs[2];
      expect(exportedDoc.name).toEqual('AbstractClass');
    });

    it('should check access', function () {
      processor.sourceFiles = ['fullMemberExample.ts'];
      var docs = [];
      processor.$process(docs);

      expect(docs.length).toBe(10);
      var members = getDocsForType(docs, 'member');
      expect(members.length).toBe(8);
      expect(getNames(_.filter(members, {access: 'public'}))).toEqual(['publicString', 'constructor', 'constructorPublicString', 'publicMethod']);
      expect(getNames(_.filter(members, {access: 'protected'}))).toEqual(['protectedNumber', 'protectedMethod']);
      expect(getNames(_.filter(members, {access: 'private'}))).toEqual(['privateBoolean', 'privateMethod']);
    });
  });


  describe('ignoreExportsMatching', function () {
    it('should ignore exports that match items in the `ignoreExportsMatching` property', function () {
      processor.sourceFiles = ['ignoreExportsMatching.ts'];
      processor.ignoreExportsMatching = [/^_/];
      var docs = [];
      processor.$process(docs);

      var moduleDoc = docs[0];
      expect(moduleDoc.docType).toEqual('module');
      expect(moduleDoc.exports).toEqual([
        jasmine.objectContaining({name: 'OKToExport'}),
        jasmine.objectContaining({name: 'thisIsOK'})
      ]);
    });

    it('should only ignore `___esModule` exports by default', function () {
      processor.sourceFiles = ['ignoreExportsMatching.ts'];
      var docs = [];
      processor.$process(docs);

      var moduleDoc = docs[0];
      expect(moduleDoc.docType).toEqual('module');
      expect(getNames(moduleDoc.exports)).toEqual([
        'OKToExport',
        '_thisIsPrivate',
        'thisIsOK'
      ]);
    });
  });


  describe('interfaces', function () {

    it('should mark optional properties', function () {
      processor.sourceFiles = ['interfaces.ts'];
      var docs = [];
      processor.$process(docs);

      var moduleDoc = docs[0];
      var exportedInterface = moduleDoc.exports[0];
      var member = exportedInterface.members[0];
      expect(member.name).toEqual('optionalProperty');
      expect(member.optional).toEqual(true);
    });


    it('should handle "call" type interfaces', function () {
      processor.sourceFiles = ['interfaces.ts'];
      var docs = [];
      processor.$process(docs);

      var moduleDoc = docs[0];
      var exportedInterface = moduleDoc.exports[0];

      expect(exportedInterface.callMember).toBeDefined();
      expect(exportedInterface.callMember.parameters).toEqual([{
        name: 'param',
        type: 'T',
        optional: false,
        defaultValue: undefined
      }]);
      expect(exportedInterface.callMember.returnType).toEqual('U');
      expect(exportedInterface.callMember.typeParameters).toEqual(['T', 'U extends Findable<T>']);
      expect(exportedInterface.newMember).toBeDefined();
      expect(exportedInterface.newMember.parameters).toEqual([{
        name: 'param',
        type: 'number',
        optional: false,
        defaultValue: undefined
      }]);
      expect(exportedInterface.newMember.returnType).toEqual('MyInterface');
    });
  });


  describe('ordering of members', function () {
    it('should order class members in order of appearance (by default)', function () {
      processor.sourceFiles = ['orderingOfMembers.ts'];
      var docs = [];
      processor.$process(docs);
      var classDoc = _.find(docs, {docType: 'class'});
      expect(classDoc.docType).toEqual('class');
      expect(getNames(classDoc.members)).toEqual([
        'firstItem',
        'otherMethod',
        'doStuff',
      ]);
    });


    it('should not order class members if not sortClassMembers is false', function () {
      processor.sourceFiles = ['orderingOfMembers.ts'];
      processor.sortClassMembers = false;
      var docs = [];
      processor.$process(docs);
      var classDoc = _.find(docs, {docType: 'class'});
      expect(classDoc.docType).toEqual('class');
      expect(getNames(classDoc.members)).toEqual([
        'firstItem',
        'otherMethod',
        'doStuff'
      ]);
    });
  });

  describe('strip namespaces', function () {
    it('should strip namespaces in return types', function () {
      processor.sourceFiles = ['stripNamespaces.ts'];
      var docs = [];
      processor.$process(docs);
      var functionDoc = _.find(docs, {docType: 'function'});
      expect(functionDoc.returnType).toEqual('IDirective');
    });

    it('should not strip ignored namespaces in return types', function () {
      var ignoreTypeScriptNamespaces = injector.get('ignoreTypeScriptNamespaces');
      ignoreTypeScriptNamespaces.push(/angular/);
      processor.sourceFiles = ['stripNamespaces.ts'];
      var docs = [];
      processor.$process(docs);
      var functionDoc = _.find(docs, {docType: 'function'});
      expect(functionDoc.returnType).toEqual('angular.IDirective');
    });
  });

  describe('source file globbing patterns', function () {
    it('should work with include patterns', function () {
      processor.sourceFiles = [
        {
          include: '*Module.ts'
        }
      ];
      var docs = [];
      processor.$process(docs);

      var moduleDocs = _.filter(docs, {docType: 'module'});
      expect(moduleDocs.length).toBe(2);
      expect(moduleDocs[0].name).toEqual('privateModule');
      expect(moduleDocs[1].name).toEqual('publicModule');
    });

    it('should work with include/exclude patterns', function () {
      processor.sourceFiles = [
        {
          include: '*Module.ts',
          exclude: 'public*.ts'
        }
      ];
      var docs = [];
      processor.$process(docs);

      var moduleDoc = docs[0];
      expect(moduleDoc.name).toEqual('privateModule');
    });
  });

  describe('separated modules and namespaces', function () {
    it('should unite separated namespaces', function () {
      processor.sourceFiles = ['uniteNamespaces1.ts', 'uniteNamespaces2.ts'];
      var docs = [];
      processor.$process(docs);

      var moduleDocs = getDocsForType(docs, 'module');
      expect(moduleDocs.length).toBe(2);
      expect(getNames(moduleDocs)).toEqual(['example', 'test']);
      expect(moduleDocs[1].id).toBe('example/test');
      expect(moduleDocs[1].exports.length).toBe(2);

      var classDocs = getDocsForType(docs, 'class');
      expect(classDocs.length).toBe(2);
      expect(getNames(classDocs)).toEqual(['InnerClassOne', 'InnerClass']);
    });

    it('should unite separated module', function () {
      processor.sourceFiles = ['uniteModules1.ts', 'uniteModules2.ts'];
      var docs = [];
      processor.$process(docs);

      var moduleDocs = getDocsForType(docs, 'module');
      expect(moduleDocs.length).toBe(2);
      expect(getNames(moduleDocs)).toEqual(['example', 'test']);
      expect(moduleDocs[1].id).toBe('example/test');
      expect(moduleDocs[1].exports.length).toBe(2);

      var classDocs = getDocsForType(docs, 'class');
      expect(classDocs.length).toBe(2);
      expect(getNames(classDocs)).toEqual(['InnerClassOne', 'InnerClass']);
    });
  });

  describe('determine and infer types and signatures', function () {
    it('should determine declared types', function () {
      processor.sourceFiles = ['determineTypes.ts'];
      var docs = [];
      processor.$process(docs);

      var classes = getDocsForType(docs, 'class');
      expect(classes.length).toBe(1);
      var typesClass = classes[0];
      expect(typesClass.members.length).toBe(8);

      var simpleType = typesClass.members[0];
      expect(simpleType.name).toBe('simpleType');
      expect(simpleType.returnType).toBe('string');

      var inferredBool = typesClass.members[1];
      expect(inferredBool.name).toBe('inferredBool');
      expect(inferredBool.returnType).toBe('boolean');

      var inferredEnum = typesClass.members[2];
      expect(inferredEnum.name).toBe('inferredEnum');
      expect(inferredEnum.returnType).toBe('SimpleEnum');

      var methodReturnsBool = typesClass.members[3];
      expect(methodReturnsBool.name).toBe('methodReturnsBool');
      expect(methodReturnsBool.returnType).toBe('boolean');

      var methodInferredString = typesClass.members[4];
      expect(methodInferredString.name).toBe('methodInferredString');
      expect(methodInferredString.returnType).toBe('string');

      var methodInferredEnum = typesClass.members[5];
      expect(methodInferredEnum.name).toBe('methodInferredEnum');
      expect(methodInferredEnum.returnType).toBe('SimpleEnum');

      var methodInferredVoid = typesClass.members[6];
      expect(methodInferredVoid.name).toBe('methodInferredVoid');
      expect(methodInferredVoid.returnType).toBe('void');

      var methodInlineType = typesClass.members[7];
      expect(methodInlineType.name).toBe('methodInlineType');
      expect(methodInlineType.returnType).toBe('{ x:string; y:number }');
    });

    it('should parse signatures', function () {
      processor.sourceFiles = ['parseSignatures.ts'];
      var docs = [];
      processor.$process(docs);

      var funcs = getDocsForType(docs, 'function');
      expect(funcs.length).toBe(1);
      check(funcs[0]);

      var classes = getDocsForType(docs, 'class');
      expect(classes.length).toBe(1);
      var clazz = classes[0];
      expect(clazz.members.length).toBe(1);
      check(clazz.members[0]);

      function check(doc) {
        expect(doc.returnType).toBe('number');
        expect(doc.parameters.length).toBe(3);
      }
    });
  });
});

function getDocsForType(docs, docType) {
  return _.filter(docs, {docType: docType});
}

function getNames(collection) {
  return collection.map(function (item) {
    return item.name;
  });
}
