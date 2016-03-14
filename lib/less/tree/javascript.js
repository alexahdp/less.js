(function (tree) {

tree.JavaScript = function (string, index, escaped) {
    this.escaped = escaped;
    this.expression = string;
    this.index = index;
};
tree.JavaScript.prototype = {
    type: "JavaScript",
    eval: function (env) {
        var result,
            that = this,
            context = {};

        var expression = this.expression.replace(/@\{([\w-]+)\}/g, function (_, name) {
            return tree.jsify(new(tree.Variable)('@' + name, that.index).eval(env));
        });

        // alexahdp
        // способа пробросить объект или строку в less
        // я найти не успел, поэтому сделал colorScheme зарезервированным словом
        if (expression.match(/colorScheme/)) {
            expression = expression.replace(/colorScheme/, JSON.stringify(env.colorScheme));
        }
        
        try {
            expression = new(Function)('return (' + expression + ')');
        } catch (e) {
            throw { message: "JavaScript evaluation error: " + e.message + " from `" + expression + "`" ,
                    index: this.index };
        }

        var variables = env.frames[0].variables();
        for (var k in variables) {
            if (variables.hasOwnProperty(k)) {
                /*jshint loopfunc:true */
                context[k.slice(1)] = {
                    value: variables[k].value,
                    toJS: function () {
                        return this.value.eval(env).toCSS();
                    }
                };
            }
        }

        try {
            result = expression.call(context);
        } catch (e) {
            throw { message: "JavaScript evaluation error: '" + e.name + ': ' + e.message.replace(/["]/g, "'") + "'" ,
                    index: this.index };
        }
        
        if (typeof(result) === 'number') {
            return new(tree.Dimension)(result);
        } else if (typeof(result) === 'string') {
            var a = new(tree.Quoted)('"' + result + '"', result, this.escaped, this.index);
            // alexahd
            if (a.value.match(/^site_\d/)) {
                a.value = '[' + a.value + ']';
            }
            return a;
        } else if (Array.isArray(result)) {
            return new(tree.Anonymous)(result.join(', '));
        } else {
            return new(tree.Anonymous)(result);
        }
    }
};

})(require('../tree'));

