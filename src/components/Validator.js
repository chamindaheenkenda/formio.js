import _get from 'lodash/get';
import _each from 'lodash/each';
import _has from 'lodash/has';
import _isNumber from 'lodash/isNumber';
import FormioUtils from '../utils/index';
export var Validator = {
  get: _get,
  each: _each,
  has: _has,
  checkValidator: function(component, validator, setting, value, data) {
    // Make sure this component isn't conditionally disabled.
    if (!FormioUtils.checkCondition(component.component, data, component.data)) {
      return '';
    }

    let result = validator.check.call(this, component, setting, value, data);
    if (typeof result === 'string') {
      return result;
    }
    if (!result) {
      return validator.message.call(this, component, setting);
    }
    return '';
  },
  validate: function(component, validator, value, data) {
    if (validator.key && _has(component.component, validator.key)) {
      let setting = this.get(component.component, validator.key);
      return this.checkValidator(component, validator, setting, value, data);
    }
    return this.checkValidator(component, validator, null, value, data);
  },
  check: function(component, data) {
    let result = '';
    let value = component.getRawValue();
    data = data || component.data;
    _each(component.validators, (name) => {
      if (this.validators.hasOwnProperty(name)) {
        let validator = this.validators[name];
        if (component.validateMultiple(value)) {
          _each(value, (val) => {
            result = this.validate(component, validator, val, data);
            if (result) {
              return false;
            }
          });
        }
        else {
          result = this.validate(component, validator, value, data);
        }
        if (result) {
          return false;
        }
      }
    });
    return result;
  },
  validators: {
    required: {
      key: 'validate.required',
      message: function(component, setting) {
        return component.t(component.errorMessage('required'), {field: component.errorLabel});
      },
      check: function(component, setting, value) {
        if (!FormioUtils.boolValue(setting)) {
          return true;
        }
        return !component.isEmpty(value);
      }
    },
    min: {
      key: 'validate.min',
      message: function(component, setting) {
        return component.t(component.errorMessage('min'), {
          field: component.errorLabel,
          min: parseFloat(setting)
        });
      },
      check: function(component, setting, value) {
        let min = parseFloat(setting);
        if (!min || (!_isNumber(value))) {
          return true;
        }
        return parseFloat(value) >= min;
      }
    },
    max: {
      key: 'validate.max',
      message: function(component, setting) {
        return component.t(component.errorMessage('max'), {
          field: component.errorLabel,
          max: parseFloat(setting)
        });
      },
      check: function(component, setting, value) {
        let max = parseFloat(setting);
        if (!max || (!_isNumber(value))) {
          return true;
        }
        return parseFloat(value) <= max;
      }
    },
    minLength: {
      key: 'validate.minLength',
      message: function(component, setting) {
        return component.t(component.errorMessage('minLength'), {
          field: component.errorLabel,
          length: (setting - 1)
        });
      },
      check: function(component, setting, value) {
        let minLength = parseInt(setting, 10);
        if (!minLength || (typeof value !== 'string')) {
          return true;
        }
        return (value.length >= minLength);
      }
    },
    maxLength: {
      key: 'validate.maxLength',
      message: function(component, setting) {
        return component.t(component.errorMessage('maxLength'), {
          field: component.errorLabel,
          length: (setting + 1)
        });
      },
      check: function(component, setting, value) {
        let maxLength = parseInt(setting, 10);
        if (!maxLength || (typeof value !== 'string')) {
          return true;
        }
        return (value.length <= maxLength);
      }
    },
    email: {
      message: function(component, setting) {
        return component.t(component.errorMessage('invalid_email'), {
          field: component.errorLabel
        });
      },
      check: function(component, setting, value) {
        // From http://stackoverflow.com/questions/46155/validate-email-address-in-javascript
        var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

        // Allow emails to be valid if the component is pristine and no value is provided.
        return (component.pristine && !value) || re.test(value);
      }
    },
    date: {
      message: function(component, setting) {
        return component.t(component.errorMessage('invalid_date'), {
          field: component.errorLabel
        });
      },
      check: function(component, setting, value) {
        return (value !== 'Invalid date');
      }
    },
    pattern: {
      key: 'validate.pattern',
      message: function(component, setting) {
        return component.t(component.errorMessage('pattern'), {
          field: component.errorLabel,
          pattern: setting
        });
      },
      check: function(component, setting, value) {
        let pattern = setting;
        if (!pattern) {
          return true;
        }
        let regexStr = '^' + pattern + '$';
        let regex = new RegExp(regexStr);
        return regex.test(value);
      }
    },
    json: {
      key: 'validate.json',
      check: function(component, setting, value, data) {
        if (!setting) {
          return true;
        }
        let valid = true;
        try {
          valid = FormioUtils.jsonLogic.apply(setting, {
            data: data,
            row: component.data
          });
        }
        catch (err) {
          valid = err.message;
        }
        return valid;
      }
    },
    custom: {
      key: 'validate.custom',
      message: function(component) {
        return component.t(component.errorMessage('custom'), {
          field: component.errorLabel
        });
      },
      check: function(component, setting, value, data) {
        if (!setting) {
          return true;
        }
        var valid = true;
        var row = component.data;
        let custom = setting;
        /*eslint-disable no-unused-vars */
        var input = value;
        /*eslint-enable no-unused-vars */
        custom = custom.replace(/({{\s+(.*)\s+}})/, function (match, $1, $2) {
          if ($2.indexOf('data.') === 0) {
            return _get(data, $2.replace('data.', ''));
          }
          else if ($2.indexOf('row.') === 0) {
            return _get(row, $2.replace('row.', ''));
          }

          // Support legacy...
          return _get(data, $2);
        });

        /* jshint evil: true */
        eval(custom);
        return valid;
      }
    }
  }
};
