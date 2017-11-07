/**
 * Created by diego on 7/14/17.
 */
const app = angular.module('player', ["ngRoute", "LocalStorageModule"]);

app.config(function($routeProvider, $locationProvider) {
    $locationProvider.hashPrefix('!');
    $locationProvider.html5Mode(false);

    $routeProvider
        .when("/video/:type/:hash", {
            template : "<video class='video-js' controls preload='auto' data-setup='{}'><source src='{{url}}' type='{{type}}'/></video>",
            controller: "VideoController"
        })
        .when("/audio/:type/:hash", {
            template : "<video class='video-js' controls preload='auto' data-setup='{}'><source src='{{url}}' type='{{type}}'/></video>",
            controller: "AudioController"
        })
        .when("/image/:type/:hash", {
            template: "<img src='{{url}}' style='padding:0; margin:0 auto; border:none'>",
            controller: "ImageController"
        })
        .when("/:anything/:type/:hash", {
            template : "<h2><a href='{{url}}'>Download</a></h2>",
            controller: "AnythingController"
        })
        .otherwise({
            template : "<h1>fail</h1>",
            controller: "AnythingController"
        })
});

app.controller("VideoController", function($scope, $routeParams, $window, $document){
    $scope.url = "https://localhost:9090/ipfs/"+$routeParams.hash;
    $scope.type = "video/"+$routeParams.type;
    var video = $document.find("video")[0];
    video.addEventListener('loadeddata', function(){
        $window.resizeTo(video.offsetWidth, video.offsetHeight);
    });

});


app.controller("AudioController", function($scope, $routeParams, $window, $document){
    $scope.url = "https://ipfs.io/ipfs/"+$routeParams.hash;
    $scope.type = "audio/"+$routeParams.type;
    var video = $document.find("video")[0];
    video.addEventListener('loadeddata', function(){
        $window.resizeTo(video.offsetWidth, video.offsetHeight);
    });

});

app.controller("ImageController", function($scope, $routeParams, $window, $document){
    $scope.url = "https://ipfs.io/ipfs/"+$routeParams.hash;
    var img = $document.find("img")[0];
    img.addEventListener('load', function(){
        $window.resizeTo(img.offsetWidth + 10, img.offsetHeight + 10);
    });

});


app.controller("AnythingController", function($scope, $routeParams){
    $scope.url = "https://ipfs.io/ipfs/"+$routeParams.hash;
});
