(function () {

  var fs = require('fs');
  var _ = require('underscore');

  var ExcelCSV = {

    _initIteratee: function (data) {
      return {
        data: data,
        out: [],
        rows: [],
        multilineFlag: false
      };
    },

    create: function (filePath) {
      var engine = new Promise(function (resolve, reject) {
        if (typeof filePath === undefined || typeof filePath !== 'string') {
          reject('File path empty');
        }

        fs.readFile(filePath, 'utf8', function (err, data) {
          if (err) {
            reject(err);
          } else {
            resolve(ExcelCSV._parse(data).out);
          }
        });
      });

      return engine;
    },

    _parse: function (data) {
      var iteratee = ExcelCSV._initIteratee(data);
      ExcelCSV._eventNewline(iteratee);
      return iteratee;
    },

    _eventNewline: function (iteratee) {
      // this is transition state only
      if (iteratee.data.length == 0) return;

      if (iteratee.data[0] === '"') {
        // start of line is a multiline cell
        // strip this first character
        iteratee.data = _.rest(iteratee.data,  1);
        iteratee.multilineFlag = true;
        ExcelCSV._eventMultiline(iteratee);
      } else if (iteratee.multilineFlag) {
        ExcelCSV._eventMultiline(iteratee);
      } else {
        ExcelCSV._eventSingle(iteratee);
      }
    },

    _eventSingle: function (iteratee) {
      // enter this state meaning that the multiline flag is not set
      var startIndex = _.indexOf(iteratee.data, ',');

      if (startIndex === -1 || startIndex === iteratee.data.length) {
        // if this is the end of the data
        // conclude everything, ignore last character
        if (startIndex === -1) {
          iteratee.data = _.without(iteratee.data, '\r', '\n');
        }
        iteratee.rows.push(_.first(iteratee.data, iteratee.data.length).join(''));
        iteratee.out.push(iteratee.rows);
        iteratee.rows = [];
        iteratee.data = '';
        // iteratee.multilineFlag = false;
      } else if (iteratee.data[startIndex + 1] === '"') {
        // next cell is multiline
        iteratee.rows.push(_.first(iteratee.data, startIndex).join(''));
        iteratee.data = _.rest(iteratee.data, startIndex + 2);
        // set multiline flag
        iteratee.multilineFlag = true;
        ExcelCSV._eventMultiline(iteratee);
      } else if (iteratee.data[startIndex + 1] === '\r') {
        iteratee.rows.push(_.first(iteratee.data, startIndex).join(''));
        // push 1 last empty cell
        iteratee.rows.push('');
        iteratee.out.push(iteratee.rows);
        iteratee.rows = [];
        iteratee.data = _.rest(iteratee.data, startIndex + 3);
        ExcelCSV._eventNewline(iteratee);
      } else {
        var newlineIndex = _.indexOf(iteratee.data, '\r');

        if (newlineIndex !== -1 && newlineIndex < startIndex) {
          // next cell is still single cell
          iteratee.rows.push(_.first(iteratee.data, newlineIndex).join(''));
          iteratee.data = _.rest(iteratee.data, newlineIndex + 2);
          iteratee.out.push(iteratee.rows);
          iteratee.rows = [];
          ExcelCSV._eventNewline(iteratee);
        } else {
          // next cell is still single cell
          iteratee.rows.push(_.first(iteratee.data, startIndex).join(''));
          iteratee.data = _.rest(iteratee.data, startIndex + 1);
          ExcelCSV._eventSingle(iteratee);
        }
      }
    },

    _eventMultiline: function (iteratee) {
      // enter this state meaning that the multiline flag is set
      var endMultilineIndex = _.indexOf(iteratee.data, '"');

      if (endMultilineIndex === -1 || endMultilineIndex === iteratee.data.length) {
        // if this is the end of the data
        // conclude everything
        if (endMultilineIndex === -1) {
          iteratee.data = _.without(iteratee.data, '\r', '\n');
        }
        iteratee.rows.push(iteratee.data.join(''));
        iteratee.out.push(iteratee.rows);
        iteratee.rows = [];
        iteratee.data = '';
      } else if (iteratee.data[endMultilineIndex + 1] === '\r') {
        iteratee.rows.push(_.first(iteratee.data, endMultilineIndex).join(''));
        // push 1 last empty cell
        iteratee.rows.push('');
        iteratee.data = _.rest(iteratee.data, endMultilineIndex + 3);
        iteratee.out.push(iteratee.rows);
        iteratee.rows = [];
        iteratee.multilineFlag = false;
        // redirect to new line
        ExcelCSV._eventNewline(iteratee);
      } else if (iteratee.data[endMultilineIndex + 1] === ',') {
        iteratee.rows.push(_.first(iteratee.data, endMultilineIndex).join(''));
        iteratee.data = _.rest(iteratee.data, endMultilineIndex + 2);
        iteratee.multilineFlag = false;
        ExcelCSV._eventNewline(iteratee);
      } else {
        // still in middle of the multiline cell
        var newlineIndex = _.indexOf(iteratee.data, '\r');

        if (newlineIndex !== -1 && newlineIndex < endMultilineIndex) {
          // console.log('    > Still in multiline cell');
          iteratee.rows.push(_.first(iteratee.data, newlineIndex).join(''));
          iteratee.data = _.rest(iteratee.data, newlineIndex + 2);
          ExcelCSV._eventMultiline(iteratee);
        } else {
          iteratee.rows.push(_.first(iteratee.data, endMultilineIndex).join(''));
          iteratee.data = _.rest(iteratee.data, newlineIndex + 2);
          iteratee.multilineFlag = false;
          ExcelCSV._eventNewline(iteratee);
        }

      }
    }
  };  // ExcelCSV

  //===========================================================================

  //======
  // NODE
  //======
  if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
      exports = module.exports = ExcelCSV;
    }
    exports.ExcelCSV = ExcelCSV;
  }
  //============
  // AMD/REQUIRE
  //============
  else if (typeof define === 'function' && define.amd) {
    define(function(require) { return ExcelCSV; });
  }
  //========
  // BROWSER
  //========
  else if (typeof window !== 'undefined') {
    window.ExcelCSV = ExcelCSV;
  }
  //===========
  // WEB WORKER
  //===========
  else if (typeof self !== 'undefined') {
    self.ExcelCSV = ExcelCSV;
  }
}());
