const {remote} = require('electron');
const ipfsAPI = require('ipfs-api');
const {dialog, Menu, MenuItem} = remote;
const {statSync, watch} = require('fs');
const mime = require('mime');
const lodash = require('lodash');
const uuid = require('uuid/v4');

const scanDirR = require('recursive-readdir-sync');
const pathUtils = require('path');
//const apiUrl = 'https://cygnusloop.herokuapp.com';
const apiUrl = 'http://localhost:8080';



const app = angular.module('app', ["ngRoute", 'ngResource', "LocalStorageModule", 'angular-thumbnails']);
const ipfs = ipfsAPI('/ip4/127.0.0.1/tcp/5002');

// const IPFS = require('ipfs-daemon')
const OrbitDB = require('orbit-db')
const orbitdb = new OrbitDB(ipfs)


app.config(function($routeProvider) {
  $routeProvider
      .when("/", {
          templateUrl : "app/views/index.html",
          controller: "HomeController"
      })
      .when("/settings", {
          templateUrl: "app/views/settings.html",
          controller: "SettingsController"
      })
      .when("/search/:term", {
          templateUrl : "app/views/search.html",
          controller: "SearchController"
      })
      .when("/advanced", {
          templateUrl : "app/views/advanced-search.html",
          controller: "AdvancedSearchController"
      })
      .when("/create", {
          templateUrl : "app/views/edit-person.html",
          controller: "CreatePersonController"
      })
      .when("/person/:id", {
          templateUrl : "app/views/person.html",
          controller: "PersonController"
      })
      .when("/person/:id/edit", {
          templateUrl : "app/views/edit-person.html",
          controller: "EditPersonController"
      })
}).run(function($rootScope, $location, $timeout) {

    var _ = lodash;

    $rootScope.navigate = function(val, delay){
        if (!delay) {
            delay = 0
        }
        $timeout(function(){$location.path(val)}, delay);
    };


    $rootScope.avatar = function(person) {
        var person = _.isEmpty(person) ? {avatar:""} : person;
        return person.avatar.indexOf('avatar.png') >= 0 && person.media.length > 0 ? "http://localhost:9090/ipfs/"+person.media[0].hash : person.avatar;
    };


});

app.directive('ngRightClick', function($parse) {
    return function(scope, element, attrs) {
        var fn = $parse(attrs.ngRightClick);
        element.bind('contextmenu', function(event) {
            scope.$apply(function() {
                event.preventDefault();
                fn(scope, {$event:event});
            });
        });
    };
});

app.service('lodash', function(){
    return lodash;
});

app.service("orbit",  function() {
    return orbitdb;
});

app.service("ipfsApi",  function() {
    return ipfs;
});

app.service("dialog",  function() {
    return dialog;
});

app.directive('topToolbar', function() {
    return {
        templateUrl: "app/views/top-toolbar.html"
    };
});

app.directive('leftToolbar', function() {
    return {
        replace: true,
        templateUrl: "app/views/left-toolbar.html",
        controller: ["$scope", "localStorageService", function($scope, $storage) {
                $scope.history = $storage.get("history") || [];
        }]

    };
});

app.directive('personList', function() {
    return {
        templateUrl: "app/views/person-list.html",
        scope: {
            people : "=?",
            navigate: "=navigate"
        },
        link: function($scope) {
            $scope.avatar = function(person) {
                var person = lodash.isEmpty(person) ? {avatar:""} : person;
                return person.avatar.indexOf('avatar.png') >= 0 && person.media.length > 0 ? "http://localhost:9090/ipfs/"+person.media[0].hash : person.avatar;
            };
        }
    };
});

app.controller('HomeController', ["$scope", "$rootScope", "$timeout","localStorageService", 'orbit', 'lodash', function($scope, $rootScope, $timeout, $storage, $orbit, _) {

    $scope.feed = [];

    const docstore = $orbit.docstore("person")
    const log = orbitdb.eventlog('person.log')


    log.events.on("ready", () => {
        docstore.events.on("ready", () => {

              var items = log.iterator({ limit: 500 }).collect().map((e) => e.payload.value.person_id)
              items = _.uniq(items);

              _.each(items, function(v){
                  $scope.$apply(function(){
                      $scope.feed.push(docstore.get(v)[0]);
                  });
              });

        });
        docstore.load();
    });
    log.load();

}]);


app.controller('SearchController', ["$scope", "$routeParams", "localStorageService", "orbit", function($scope, $routeParams, $storage, $orbit) {
    var history = $storage.get("history") || [];
    const term = $routeParams.term.trim().toUpperCase();
    history.push($routeParams.term)
    $storage.set("history", history.filter((v, i, a) => a.indexOf(v) === i));

    $scope.results = [];

    const docstore = $orbit.docstore("person")

    docstore.events.on('ready', () => {
        const all = docstore.query((doc) =>
        {
            var json = JSON.stringify(doc).toUpperCase();
            terms = term.split(/\W/);
            for (var t of terms) {
                 if (json.indexOf(t) >= 0) {
                     return true;
                 }
            }
            return false;
        });

        // [{ _id: 'shamb0t', name: 'shamb0t', followers: 500 }]

        if (all.length > 0) {
             for (var i in all) {
                 $scope.$apply(function(){
                     $scope.results.push(all[i])
                  });
             }
        }
    })
    docstore.load()


}]);

app.controller('AdvancedSearchController', ["$scope", "orbit", function($scope, $orbit) {
    $scope.results = [];


    $scope.findPerson = function(name, email, phone, location){
        var name = (name+"").trim().toUpperCase();
        var email = (email+"").trim().toUpperCase();
        var phone = (phone+"").trim();

        var id = (name+email+phone).replace( /(\W)/ig, '');

        $scope.results.splice(0, $scope.results.length);

        const docstore = $orbit.docstore("person")

        docstore.events.on('ready', () => {
            const all = docstore.query((doc) =>
            {
                var names = JSON.stringify(doc.names).toUpperCase();
                var phones = JSON.stringify(doc.phones).toUpperCase();
                var emails = JSON.stringify(doc.emails).toUpperCase();
                var locations = JSON.stringify(doc.locations).toUpperCase();

                return names.indexOf(name) >= 0 || phones.indexOf(phone) >= 0 || emails.indexOf(email) >= 0 || locations.indexOf(location) >= 0
            });

            // [{ _id: 'shamb0t', name: 'shamb0t', followers: 500 }]

            if (!all.length) {
                // not doing this here anymore

            } else {
                 for (var i in all) {
                     $scope.$apply(function(){
                         $scope.results.push(all[i])
                      });
                 }
            }
        })
        docstore.load()

    }
}]);

app.controller('PersonController', ["$scope", "$routeParams" ,"orbit", "dialog", 'ipfsApi',function($scope,$routeParams, $orbit, $dialog, $ipfsApi) {

    $scope.person = {};
    const docstore = $orbit.docstore("person")

    docstore.events.on('ready', () => {
        $scope.$apply(function(){
            $scope.person = docstore.get($routeParams.id)[0]
        })
        console.log($scope.person);
    })
    docstore.load()

    $scope.uploadDialog = function(){
        $dialog.showOpenDialog({properties: ['openFile', 'multiSelections']}, function(files){
            var media = ($scope.person.media || []).map((i) => {delete i.$$hashKey; return i});
            console.log(files)
            for (var idx in files) {

                $ipfsApi.util.addFromFs(files[idx], function(err, items) {
                    var entry = items[0]
                    if (media.indexOf(entry) == -1) {
                        media.push(entry);
                    }

                    if (files.length-1 == idx) {
                        $scope.person.media = media.filter((v, i, a) => a.indexOf(v) == i);

                        docstore.put($scope.person)
                        .then(() => docstore.get($scope.person._id))
                        .then((value) => {
                            $scope.$apply(function(){
                                $scope.person = value[0];
                             });
                        }).catch((err)=>console.error(error));
                    }

                });
            }


        });
    };

}]);




app.controller('EditPersonController', ["$scope", "$routeParams", "lodash" ,"orbit", "dialog", 'ipfsApi',function($scope,$routeParams, _, $orbit, $dialog, $ipfsApi) {

    $scope.person = {};

    $scope.names = [];

    const docstore = $orbit.docstore("person")
    const log = orbitdb.eventlog('person.log')
    log.load()

    docstore.events.on('ready', () => {
        $scope.$apply(function(){
            $scope.person = docstore.get($routeParams.id)[0]
        })
        console.log($scope.person);
    })
    docstore.load()

    $scope.addName = function(name) {
        if (!_.includes($scope.person.names, name)) {
            $scope.person.names.push(name);
            $scope.newName = "";
        }
    }

    $scope.addEmail = function(email) {
        if (!_.includes($scope.person.emails, email)) {
            $scope.person.emails.push(email);
            $scope.newEmail  = "";
        }
    }

    $scope.addPhone = function(phone) {
        if (!_.includes($scope.person.phones, phone)) {
            $scope.person.phones.push(phone);
            $scope.newPhone = "";
        }
    }

    $scope.addLocation = function(location) {
        if (!_.includes($scope.person.locations, location)) {
            $scope.person.locations.push(location);
            $scope.newLocation = "";
        }
    }

    $scope.save = function(person) {
        person.names = person.names.filter((v, i, a) => a.indexOf(v) === i).filter((v) => v);
        person.emails = person.emails.filter((v, i, a) => a.indexOf(v) === i).filter((v) => v);
        person.phones = person.phones.filter((v, i, a) => a.indexOf(v) === i).filter((v) => v);
        person.locations = person.locations.filter((v, i, a) => a.indexOf(v) === i).filter((v) => v);

        docstore.events.on('ready', () => {

            docstore.put(person)
            .then(() => docstore.get($scope.person._id))
            .then((value) => {
                log.add({ person_id: value[0]._id, action: "edited"})
                  .then(() => {
                      $scope.navigate('/person/'+value[0]._id, 500);
                  })

            });


        })
        docstore.load()

    };

    $scope.uploadDialog = function(){
        $dialog.showOpenDialog({properties: ['openFile', 'multiSelections']}, function(files){
            var media = ($scope.person.media || []).map((i) => {delete i.$$hashKey; return i});
            console.log(files)
            for (var idx in files) {

                $ipfsApi.util.addFromFs(files[idx], function(err, items) {
                    var entry = items[0]
                    if (media.indexOf(entry) == -1) {
                        media.push(entry);
                    }

                    if (files.length-1 == idx) {
                        $scope.$apply(function(){
                            $scope.person.media = media.filter((v, i, a) => a.indexOf(v) == i);
                        })
                    }

                });
            }


        });
    };

}]);




app.controller('CreatePersonController', ["$scope", "$routeParams" , "lodash","orbit", "dialog", 'ipfsApi',function($scope,$routeParams, _, $orbit, $dialog, $ipfsApi) {

    // create a random unique id
    const id = uuid();

    $scope.person = { _id: id, avatar: "./app/images/avatar.png", description: '', names: [], emails:[], phones:[], locations: [], media: [], comments: [] };

    $scope.names = [];

    const docstore = $orbit.docstore("person")
    const log = orbitdb.eventlog('person.log')
    log.load()


    $scope.addName = function(name) {
        if (!_.includes($scope.person.names, name)) {
            $scope.person.names.push(name);
            $scope.newName = "";
        }
    }

    $scope.addEmail = function(email) {
        if (!_.includes($scope.person.emails, email)) {
            $scope.person.emails.push(email);
            $scope.newEmail  = "";
        }
    }

    $scope.addPhone = function(phone) {
        if (!_.includes($scope.person.phones, phone)) {
            $scope.person.phones.push(phone);
            $scope.newPhone = "";
        }
    }

    $scope.addLocation = function(location) {
        if (!_.includes($scope.person.locations, location)) {
            $scope.person.locations.push(location);
            $scope.newLocation = "";
        }
    }

    $scope.save = function(person, name, email, phone, location) {
        person.names.push(name);
        person.emails.push(email);
        person.phones.push(phone);
        person.locations.push(location);

        person.names = person.names.filter((v, i, a) => a.indexOf(v) === i).filter((v) => v);
        person.emails = person.emails.filter((v, i, a) => a.indexOf(v) === i).filter((v) => v);
        person.phones = person.phones.filter((v, i, a) => a.indexOf(v) === i).filter((v) => v);
        person.locations = person.locations.filter((v, i, a) => a.indexOf(v) === i).filter((v) => v);

        docstore.events.on('ready', () => {

            docstore.put(person)
            .then(() => docstore.get($scope.person._id))
            .then((value) => {
                log.add({ person_id: value[0]._id, action: "created"})
                  .then(() => {
                      $scope.navigate('/person/'+value[0]._id, 500);
                  })

            });


        })
        docstore.load()

    };

    $scope.uploadDialog = function(){
        $dialog.showOpenDialog({properties: ['openFile', 'multiSelections']}, function(files){
            var media = ($scope.person.media || []).map((i) => {delete i.$$hashKey; return i});
            console.log(files)
            for (var idx in files) {

                $ipfsApi.util.addFromFs(files[idx], function(err, items) {
                    var entry = items[0]
                    if (media.indexOf(entry) == -1) {
                        media.push(entry);
                    }

                    if (files.length-1 == idx) {
                        $scope.$apply(function(){
                            $scope.person.media = media.filter((v, i, a) => a.indexOf(v) == i);
                        });
                    }

                });
            }


        });
    };

}]);




app.controller('SettingsController', ["$scope", "dialog", "localStorageService", function($scope, $dialog, $storage) {
    $scope.clearRecentHistory = function(){
        $storage.set("history", []);
    };
}]);
