/** @module Field */
var _ = require('lodash');
var Schema = require('./schema');
var Q = require('q');

/**
* @namespace
*/
var Field = module.exports = exports = {};

/**
* A helper to produce middleware functions.
*
* @param  {Function} modifierFunc - The function used to modify the values coming from
*                                   the underlying schema, and return values.
* @return {Function} a middleware function for modifying schema functionality.
*
* @example
* Field.optional = Field.createMiddleware(function(value, object, options, schema){
*   if(value === undefined){
*     return null;
}
*   return schema.validate(value, object, options);
* });
*
*/
Field.createMiddleware = function(modifierFunc){
  var extraArgLength = modifierFunc.length - 4; // amount of extra args that should have been passed
  return function(){
    var initialArgs = Array.prototype.slice.call(arguments, 0);
    var schema = initialArgs.pop();
    var compiled = Schema(schema);

    if(initialArgs.length != extraArgLength){
      var extraParamNames = getParamNames(modifierFunc).slice(0, extraArgLength);
      throw Error('Middleware function missing extra argument(s): ' + extraParamNames);
    }

    var validator = function(value, object, options){
      if(options === undefined){
        options = object;
        object = null;
      }

      var args = initialArgs.slice(0);
      args.push(value);
      args.push(object || {});
      args.push(options || {});
      args.push(compiled);

      return Q.resolve(modifierFunc.apply(null, args));
    };

    return Schema({validate: validator});
  };
};

var STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;
var ARGUMENT_NAMES = /([^\s,]+)/g;

function getParamNames(func) {
  var fnStr = func.toString().replace(STRIP_COMMENTS, '');
  var result = fnStr.slice(fnStr.indexOf('(')+1, fnStr.indexOf(')')).match(ARGUMENT_NAMES);
  if(result === null){
    result = [];
  }
  return result;
}

/**
* Makes a schema optional.  If the value undefined is passed in, no errors are returned,
* if anything else is passed in, regular schema validation is run.
*
* @method
* @param  {Schema|Object} schema - the schema (or raw schema).
* @return {Schema}        A schema that can be used to validate optional values.
*
* @example
* var maybeSchema = Schema({
*   maybe: Field.optional({
*     'error message': validatorFunction
*   })
* });
*/
Field.optional = Field.createMiddleware(function(value, object, options, schema){
  if(value === undefined){
    return null;
  }
  return schema.validate(value, object, options);
});

/**
* Give a field an explicit required message.  If the field is undefined the given
* message is added as an error.
*
* @method
* @param  {String}        message - The message to add as an error when the value
*                                   of the field is undefined.
* @param  {Schema|Object} schema  - the schema (or raw schema).
* @return {Schema}        A schema that will handle undefined values with the given
*                         message.
*
* @example
* var definitelySchema = Schema({
*   definitely: Field.required('The definitely field is required', {
*     'error message': validatorFunction
*   })
* });
*/
Field.required = Field.createMiddleware(function(message, value, object, options, schema){
  if(value !== undefined){
    return schema.validate(value, object, options);
  }
  return [message];
});
