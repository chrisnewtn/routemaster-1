'use strict';

var fs = require('fs');
var path = require('path');
var Router;
var logger;

function resolveDirectory(directory){
    var parentDirectory = path.dirname(module.parent.filename);

    return path.resolve(parentDirectory, directory);
}

function warn(message){
    var message = 'Routemaster:' + message;

    if(logger){
        logger.warn(message);
    }else{
        console.warn(message);
    }
}

function getRoutingFiles(directory){
    var target = resolveDirectory(directory);

    return fs.readdirSync(target).reduce(function(files, filename){
        var fullyQualifiedFilename = path.join(target, filename);

        if(fs.lstatSync(fullyQualifiedFilename).isDirectory()){
            return files.concat(getRoutingFiles(fullyQualifiedFilename));
        }

        if(filename[0] === '.'){
            warn('Skipping hidden file "' + fullyQualifiedFilename + '"');
        }else if(filename.indexOf('.js') == -1){
            warn('Skipping non-js file "' + fullyQualifiedFilename + '"');
        }else{
            files.push(fullyQualifiedFilename);
        }

        return files;
    }, []);
}

function buildRouter(masterRouter, routingFile){
    var router = new Router();
    var routingFn;

    try{
        routingFn = require(routingFile);
    }catch(e){
        warn('Skipping unparsable file "' + routingFile + '"');
    }

    if(typeof routingFn === 'function'){
        routingFn(router);
    }else{
        warn('Skipping "' + routingFile + '" as it doesn\'t export a function');
    }

    masterRouter.use(router);
    return masterRouter;
}

module.exports = function routemaster(options){
    options = options || {};

    if(!options.Router){
        throw new Error('Routemaster requires express.Router as its Router option');
    }

    Router = options.Router;

    if(!options.directory){
        throw new Error('Routemaster require a directory option');
    }

    if(options.logger && typeof options.logger.warn !== 'function'){
        throw new Error('Routermaster expects a logger with a warn method');
    }

    var routingFiles = getRoutingFiles(options.directory);

    return routingFiles.reduce(buildRouter, new Router());
};
