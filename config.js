/**
 * Created by diego on 7/18/17.
 */

const defaults = {
    repoPath: "./"
};

module.exports = (function(d){
    this._settings = d;
    this.set = function(key, val){
        this._settings[key] = val;
    }

    this.get = function(key) {
        return this._settings[key];
    }

    return this;
})(defaults);