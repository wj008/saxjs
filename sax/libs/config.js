"use strict";
var path = require('path');
var Hjson = require('hjson');
var fs = require('fs');
var Config = (function () {
    function Config(dirname) {
        this._names = {};
        this._global = {};
        this._dirname = dirname;
    }
    Config.prototype.setDir = function (dirname) {
        this._dirname = dirname;
    };
    Config.prototype.getDir = function () {
        return this._dirname;
    };
    //加载配置文件
    Config.prototype.load = function (name, filepath, callback) {
        if (filepath === void 0) { filepath = null; }
        if (callback === void 0) { callback = null; }
        if (typeof filepath == 'function' && callback == null) {
            callback = filepath;
            filepath = null;
        }
        if (callback == null) {
            callback = function (err) {
                if (err) {
                    throw err;
                }
            };
        }
        if (this._names[name]) {
            callback(null, this._names[name]);
            return;
        }
        var that = this;
        if (filepath && typeof filepath == 'string') {
            fs.exists(filepath, function (exists) {
                if (!exists) {
                    callback(new Error("cat not found config file:" + filepath));
                    return;
                }
                var extname = path.extname(filepath).toLowerCase();
                if (extname == '.json' || extname == '.js') {
                    var data = require(filepath);
                    that._names[name] = data;
                    callback(null, data);
                    return;
                }
                else if (extname == '.hjson') {
                    fs.readFile(filepath, 'utf-8', function (err, text) {
                        if (err) {
                            callback(err);
                            return;
                        }
                        try {
                            var data = Hjson.parse(text);
                            that._names[name] = data;
                            callback(null, data);
                        }
                        catch (e) {
                            callback(e);
                            return;
                        }
                    });
                }
                else {
                    callback(new Error('This extension does not support:' + extname));
                }
            });
            return;
        }
        if (filepath == null) {
            var errs_1 = [];
            var extname = path.extname(name).toLowerCase();
            if (extname == '') {
                var tempext_1 = null;
                var load_1 = function () {
                    if (tempext_1 == null) {
                        tempext_1 = '.hjson';
                    }
                    else if (tempext_1 == '.hjson') {
                        tempext_1 = '.json';
                    }
                    else if (tempext_1 == '.json') {
                        tempext_1 = '.config.js';
                    }
                    else {
                        var errText = "cat not load config name:" + name + "\n" + errs_1.join("\n");
                        callback(new Error(errText));
                        return;
                    }
                    var tempname = name + tempext_1;
                    filepath = path.join(that._dirname, tempname);
                    that.load(name, filepath, function (err, data) {
                        if (err) {
                            if (typeof err == 'string') {
                                errs_1.push(err);
                            }
                            else if (err instanceof Error) {
                                errs_1.push(err.message);
                            }
                            load_1();
                            return;
                        }
                        callback(null, data);
                        return;
                    });
                };
                load_1();
            }
            else {
                var tempname = name;
                filepath = path.join(that._dirname, tempname);
                that.load(name, filepath, function (err, data) {
                    if (err) {
                        callback(err);
                        return;
                    }
                    callback(null, data);
                    return;
                });
            }
        }
    };
    Config.prototype.loadSync = function (name, filepath) {
        if (filepath === void 0) { filepath = null; }
        if (this._names[name]) {
            return this._names[name];
        }
        var that = this;
        if (filepath && typeof filepath == 'string') {
            var exists = fs.existsSync(filepath);
            if (!exists) {
                throw new Error("cat not found config file:" + filepath);
            }
            var extname = path.extname(filepath).toLowerCase();
            if (extname == '.json' || extname == '.js') {
                var data = require(filepath);
                that._names[name] = data;
                return data;
            }
            else if (extname == '.hjson') {
                try {
                    var text = fs.readFileSync(filepath, 'utf-8');
                    var data = Hjson.parse(text);
                    that._names[name] = data;
                    return data;
                }
                catch (e) {
                    throw e;
                }
            }
            else {
                throw new Error('This extension does not support:' + extname);
            }
        }
        else {
            var errs = [];
            var extname = path.extname(name).toLowerCase();
            if (extname == '') {
                var tempexts = [".hjson", '.json', '.config.js'];
                for (var i = 0; i < tempexts.length; i++) {
                    var tempname = name + tempexts[i];
                    filepath = path.join(that._dirname, tempname);
                    try {
                        var data = that.loadSync(name, filepath);
                        return data;
                    }
                    catch (err) {
                        errs.push(err.message);
                    }
                }
                var errText = "cat not load config name:" + name + "\n" + errs.join("\n");
                throw new Error(errText);
            }
            else {
                filepath = path.join(that._dirname, name);
                var data = that.loadSync(name, filepath);
                return data;
            }
        }
    };
    Config.prototype.gload = function (name, filepath, callback) {
        if (filepath === void 0) { filepath = null; }
        if (callback === void 0) { callback = null; }
        var that = this;
        if (typeof filepath == 'function' && callback == null) {
            callback = filepath;
            filepath = null;
        }
        this.load(name, filepath, function (err, data) {
            if (err) {
                callback(err);
                return;
            }
            for (var key in data) {
                that._global[key] = data[key];
            }
            callback(null, that._global);
        });
    };
    Config.prototype.gloadSync = function (name, filepath) {
        if (filepath === void 0) { filepath = null; }
        var data = this.loadSync(name, filepath);
        for (var key in data) {
            this._global[key] = data[key];
        }
        return this._global;
    };
    //获取值
    Config.prototype.get = function (key, def) {
        if (def === void 0) { def = null; }
        var name = null;
        var temp = key.split(':');
        if (temp.length == 2) {
            name = temp[0];
            key = temp[1];
        }
        if (key == '*') {
            if (name) {
                if (!this._names[name]) {
                    if (typeof def !== 'object') {
                        return null;
                    }
                    return def;
                }
                if (typeof def === 'object') {
                    var ret = {};
                    for (var nkey in this._names[name]) {
                        ret[nkey] = this._names[name][nkey];
                    }
                    for (var dkey in def) {
                        if (ret[dkey] === void 0) {
                            ret[dkey] = def[dkey];
                        }
                    }
                    return ret;
                }
                return this._names[name];
            }
            if (typeof def === 'object') {
                var ret = {};
                for (var nkey in this._global) {
                    ret[nkey] = this._global[nkey];
                }
                for (var dkey in def) {
                    if (ret[dkey] === void 0) {
                        ret[dkey] = def[dkey];
                    }
                }
                return ret;
            }
            return this._global;
        }
        var keys = key.split('.');
        if (keys.length == 1) {
            if (name) {
                if (!this._names[name]) {
                    return def;
                }
                return this._names[name][key] === void 0 ? def : this._names[name][key];
            }
            return this._global[key] === void 0 ? def : this._global[key];
        }
        var data = null;
        if (name) {
            if (!this._names[name]) {
                return def;
            }
            data = this._names[name];
        }
        else {
            data = this._global;
        }
        for (var i = 0; i < keys.length; i++) {
            var tkey = keys[i];
            if (typeof data !== 'object' || data[tkey] === void 0) {
                return def;
            }
            data = data[tkey];
        }
        return data;
    };
    //设置值
    Config.prototype.set = function (key, val) {
        var name = null;
        var temp = key.split(':');
        if (temp.length == 2) {
            name = temp[0];
            key = temp[1];
        }
        if (key == '*') {
            if (name) {
                if (typeof val != 'object') {
                    return;
                }
                if (!this._names[name]) {
                    this._names[name] = {};
                }
                for (var key_1 in val) {
                    this._names[name][key_1] = val[key_1];
                }
                return;
            }
            for (var key_2 in val) {
                this._global[key_2] = val[key_2];
            }
            return;
        }
        var keys = key.split('.');
        if (keys.length == 1) {
            if (name) {
                if (!this._names[name]) {
                    this._names[name] = {};
                }
                this._names[name][key] = val;
                return;
            }
            this._global[key] = val;
        }
        var data = null;
        if (name) {
            if (!this._names[name]) {
                this._names[name] = {};
            }
            data = this._names[name];
        }
        else {
            data = this._global;
        }
        for (var i = 0; i < keys.length - 1; i++) {
            var tkey = keys[i];
            if (typeof data !== 'object') {
                return;
            }
            if (data[tkey] === void 0) {
                data[tkey] = {};
            }
            data = data[tkey];
        }
        data[keys[keys.length - 1]] = val;
    };
    //保存配置文件
    Config.prototype.save = function (filepath, data, callback) {
        if (callback === void 0) {
            callback = function (err) {
                if (err) {
                    throw err;
                }
            };
        }
        var extname = path.extname(filepath).toLowerCase();
        if (typeof data !== "object") {
            callback(new Error('data must by object'));
            return;
        }
        var code = JSON.stringify(data);
        if (!(extname == '.js' || extname == '.json' || extname == '.hjson')) {
            callback(new Error('This extension does not support:' + extname));
            return;
        }
        if (extname == '.js') {
            code = 'module.exports = ' + code;
        }
        var dirname = path.dirname(filepath);
        if (dirname == '.') {
            dirname = this._dirname;
            filepath = path.join(dirname, filepath);
        }
        //检查目录是否存在
        fs.exists(dirname, function (exists) {
            if (!exists) {
                callback(new Error("cat not found the dirname:" + dirname));
                return;
            }
            fs.writeFile(filepath, code, function (err) {
                if (err) {
                    callback(err);
                    return;
                }
                callback(null);
            });
        });
    };
    Config.prototype.saveSync = function (filepath, data) {
        var extname = path.extname(filepath).toLowerCase();
        if (typeof data !== "object") {
            throw new Error('data must by object');
        }
        var code = JSON.stringify(data);
        if (!(extname == '.js' || extname == '.json' || extname == '.hjson')) {
            throw new Error('This extension does not support:' + extname);
        }
        if (extname == '.js') {
            code = 'module.exports = ' + code;
        }
        var dirname = path.dirname(filepath);
        if (dirname == '.') {
            dirname = this._dirname;
            filepath = path.join(dirname, filepath);
        }
        var exists = fs.existsSync(dirname);
        if (!exists) {
            throw new Error("cat not found the dirname:" + dirname);
        }
        try {
            fs.writeFileSync(filepath, code);
        }
        catch (err) {
            throw err;
        }
    };
    return Config;
}());
exports.Config = Config;
