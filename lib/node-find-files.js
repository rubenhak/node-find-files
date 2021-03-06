var __extends = this.__extends || function (d, b) {
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var fs = require("fs")
var async = require("async")
var path = require("path")

var events = require("events")
var EventEmitter = events.EventEmitter;
var finder = (function (_super) {
    __extends(finder, _super);
    function finder(options) {
        _super.call(this);
        this.options = options;
        if(options.fileModifiedDate) {
            options.filterFunction = function (strPath, fsStat) {
                return (fsStat.mtime > options.fileModifiedDate) ? true : false;
            };
        }
    }
    finder.prototype.startSearch = function () {
        var that = this;
        this.recurseFolder(that.options.rootFolder, function (err) {
            if(err) {
                that.emit("error", err);
                return;
            }
            that.emit("complete");
        });
    };
    finder.prototype.recurseFolder = function (strFolderName, folderCompleteCallback) {
        var that = this;
        fs.readdir(strFolderName, function (err, files) {
            if(err) {
                pathError(err, strFolderName);
                return folderCompleteCallback(err);
            }
            if(!files) {
                return folderCompleteCallback(null);
            }
            async.each(files, function (file, callback) {
                try  {
                    var strPath = path.join(strFolderName, file);
                } catch (e) {
                    pathError(e, strPath);
                    return callback(null);
                }
                fs.lstat(strPath, function (err, stat) {
                    if(err) {
                        pathError(err, strPath);
                        return callback(null);
                    }
                    if(!stat) {
                        pathError(new Error("Could not get stat for file " + strPath), strPath);
                        return callback(null);
                    }
                    if(stat.isDirectory()) {
                        checkMatch(file, strPath, stat);
                        if (checkCanGoDeep(file, strPath, stat)) {
                            that.recurseFolder(strPath, function (err) {
                                if(err) {
                                    pathError(err, strPath);
                                }
                                return callback(null);
                            });
                        } else {
                            return callback(null);
                        }
                    } else {
                        checkMatch(file, strPath, stat);
                        return callback(null);
                    }
                });
            }, function onComplete(err) {
                if(err) {
                    pathError(err, strFolderName);
                }
                return folderCompleteCallback(err);
            });
        });
        function pathError(err, strPath) {
            try  {
                that.emit("patherror", err, strPath);
            } catch (e) {
                that.emit("error", new Error("Error in path Error Handler" + e));
            }
        }
        function checkMatch(name, strPath, stat) {
            try  {
                if(that.options.filterFunction(strPath, stat, name)) {
                    that.emit("match", strPath, stat);
                }
            } catch (e) {
                pathError(e, strPath);
            }
        }
        function checkCanGoDeep(name, strPath, stat) {
            if (!that.options.canGoDeepFunction) {
                return true;
            }
            if(!that.options.canGoDeepFunction(strPath, stat, name)) {
                that.emit("skip", strPath);
                return false;
            }
            return true;
        }
    };
    return finder;
})(EventEmitter);
exports.finder = finder;
(module).exports = finder;
//@ sourceMappingURL=node-find-files.js.map
