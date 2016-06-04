/* Copyright © 2015-2016 David Valdman */

define(function(require, exports, module) {
    var Transform = require('../core/Transform');
    var View = require('../core/View');
    var ReduceStream = require('../streams/ReduceStream');

    var CONSTANTS = {
        DIRECTION : {
            X : 0, 
            Y : 1
        }
    };

    // Default map to convert displacement to transform
    var DEFAULT_LENGTH_MAP = function(length){
        return (this.options.direction === CONSTANTS.DIRECTION.X)
            ? Transform.translateX(length)
            : Transform.translateY(length);
    };

    /**
     * A layout which arranges items in series based on their size.
     *  Items can be arranged vertically or horizontally.
     *
     * @class SequentialLayout
     * @constructor
     * @namespace Layouts
     * @extends Core.View
     * @param [options] {Object}                        Options
     * @param [options.direction]{Number}               Direction to lay out items
     * @param [options.spacing] {Transitionable|Number} Gutter spacing between items
     */
    var SequentialLayout = View.extend({
        defaults : {
            direction : CONSTANTS.DIRECTION.X,
            spacing : 0
        }, 
        initialize : function initialize(options) {
            // Store nodes and flex values
            this.nodes = [];

            if (typeof options.spacing === 'number'){
                this.stream = new ReduceStream(function(prev, size){
                    if (!size) return false;
                    return prev + size[options.direction] + options.spacing;
                }.bind(this));
            }
            else {
                this.stream = new ReduceStream(function(prev, size, spacing){
                    if (!size) return false;
                    return prev + size[options.direction] + spacing;
                }, undefined, options.spacing);
            }

            this.setLengthMap(DEFAULT_LENGTH_MAP);
            
            this.output.subscribe(this.stream.headOutput);
        },
        /*
        * Set a custom map from length displacements to transforms.
        * `this` will automatically be bound to the instance.
        *
        * @method setLengthMap
        * @param map [Function] Map `(length) -> transform`
        */
        setLengthMap : function(map){
            this.transformMap = map.bind(this);
        },
        /*
         * Add a renderable to the end of the layout
         *
         * @method push
         * @param map [Function] Map `(length) -> transform`
         */
        push : function(item) {
            this.nodes.push(item);
            var length = this.stream.push(item.size);
            var transform = length.map(this.transformMap);
            this.add({transform : transform}).add(item);
        },
        /*
         * Unlink the last renderable in the layout
         *
         * @method pop
         * @return item
         */
        pop : function(){
            return this.unlink(this.nodes.length - 1);
        },
        /*
         * Add a renderable to the beginning of the layout
         *
         * @method unshift
         * @param item {Surface|View} Renderable
         */
        unshift : function(item){
            this.nodes.unshift(item);
            var length = this.stream.unshift(item.size);
            var transform = length.map(this.transformMap);
            this.add({transform : transform}).add(item);
        },
        /*
         * Unlink the first renderable in the layout
         *
         * @method shift
         * @return item
         */
        shift : function(){
            return this.unlink(0);
        },
        /*
         * Add a renderable after a specified renderable
         *
         * @method insertAfter
         * @param prevItem {NumberSurface|View} Index or renderable to insert after
         * @param item {Surface|View}           Renderable to insert
         */
        insertAfter : function(prevItem, item) {
            var index;
            if (typeof prevItem === 'number'){
                index = prevItem + 1;
                prevItem = this.nodes[prevItem];
            }
            else index = this.nodes.indexOf(prevItem) + 1;

            this.nodes.splice(index, 0, item);

            if (!prevItem) return this.push(item);
            var length = this.stream.insertAfter(prevItem.size, item.size);
            var transform = length.map(this.transformMap);
            this.add({transform : transform}).add(item);
        },
        /*
         * Add a renderable before a specified renderable
         *
         * @method insertAfter
         * @param prevItem {Number|Surface|View} Index or renderable to insert before
         * @param item {Surface|View}            Renderable to insert
         */
        insertBefore : function(postItem, item){
            var index;
            if (typeof postItem === 'number'){
                index = postItem - 1;
                postItem = this.nodes[postItem];
            }
            else index = this.nodes.indexOf(postItem) - 1;

            this.nodes.splice(index, 0, item);
            
            if (!postItem) return this.unshift(item);
            var length = this.stream.insertBefore(postItem.size, item.size);
            var transform = length.map(this.transformMap);
            this.add({transform : transform}).add(item);
        },
        /*
         * Unlink the renderable.
         *  To remove the renderable, call the `.remove` method on it after unlinking.
         *
         * @method unlink
         * @param item {Surface|View} Item to remove
         * @return item
         */
        unlink : function(item){
            var index;
            if (typeof item === 'number'){
                index = item;
                item = this.nodes[item];
            }
            else index = this.nodes.indexOf(item);

            if (!item || !item.size) return;
            this.nodes.splice(index, 1);
            this.stream.remove(item.size);

            return item;
        }
    }, CONSTANTS);

    module.exports = SequentialLayout;
}); 
