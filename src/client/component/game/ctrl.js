define('game/ctrl', [
    'ng',
    'text!game/style.css',
    'text!game/tpl.html',
    'text!game/txt.json'
], function(
    ng,
    style,
    tpl,
    txt
){
    return function(ngModule){
        ngModule
            .controller('gameCtrl', [ '$scope', '$routeParams', '$http', '$location', 'cpStyle', 'i18n', function($scope, $routeParams, $http, $location, cpStyle, i18n){
                cpStyle('gameCtrl', style);
                i18n($scope, txt);

                $scope.joined = false;
                $scope.id = $routeParams.id;
                $scope._WAITING_FOR_OPPONENT = 0;
                $scope._GAME_IN_PROGRESS = 1;
                $scope._WAITING_FOR_REMATCH = 2;
                $scope._DEACTIVATED = 3;

                $scope.options = null;
                $scope.pastChoices = null;
                $scope.resultHalfMatrix = null;
                $scope.turnLength = null;
                $scope.rematchTimeLimit = null;
                $scope.maxTurns = null;
                $scope.myIdx = null;
                $scope.turnStart = null;
                $scope.state = null;
                $scope.currentChoices = null;
                $scope.pastChoicesLen = null;
                $scope.penultimateChoices = null;
                $scope.counter = null;

                var choiceIdxs = null;
                var pollTimeout = null;
                var counterTimeout = null;
                var lastTurnStartStr = null;
                var newGameFailedAttempts = 0;
                var pastChoicesLenAtLastSetWin = 0;

                $scope.choose = function(choice){
                    var now = new Date();
                    if($scope.state === $scope._GAME_IN_PROGRESS && $scope.turnStartDate < now) {
                        $http.post('api/act', {act: 'choose', val: choice}).success(function (data) {
                            updateScope(data);
                        });
                    }
                };

                $scope.rematch = function(){
                    if($scope.state === $scope._WAITING_FOR_REMATCH)
                    $http.post('api/act', {act: 'restart'}).success(function (data) {
                        updateScope(data);
                    });
                };

                $scope.newGame = function(){
                    $location.path('/');
                };

                $scope.getP1Result = function(p1C, p2C){
                    if(p1C == p2C){
                        return 0;
                    }

                    var p1CIdx = choiceIdxs[p1C];
                    var p2CIdx = choiceIdxs[p2C];

                    if(p1CIdx > p2CIdx){
                        return $scope.resultHalfMatrix[p1CIdx - 1][p2CIdx];
                    }else{
                        return $scope.resultHalfMatrix[p2CIdx - 1][p1CIdx] * -1;
                    }
                };

                $scope.now = function(){
                    return new Date();
                };

                function join() {
                    $scope.joined = false;
                    getInfo('api/join', {id: $scope.id});
                }

                function poll(){
                    getInfo('api/poll', {id: $scope.id, v: $scope.v});
                }

                function getInfo(apiPath, reqData){
                    clearTimeout(pollTimeout);
                    $http.post(apiPath, reqData).success(function(data){
                        updateScope(data);
                        if($scope.state !== $scope._DEACTIVATED){
                            pollTimeout = setTimeout(poll, 1000);
                        }else{
                            pollTimeout = null;
                        }
                    }).error(function(){
                        if(apiPath === 'api/join' && newGameFailedAttempts < 2){
                            newGameFailedAttempts++;
                            $scope.newGame();
                        }
                    });
                }

                function updateScope(data){
                    if(typeof data === 'object') {
                        ng.extend($scope, data);
                        if(choiceIdxs == null){
                            choiceIdxs = {};
                            var opsLen = $scope.options.length;
                            for(var i = 0; i < opsLen; i++){
                                choiceIdxs[$scope.options[i]] = i;
                            }
                        }
                        setPastChoices();
                        setWins();
                        $scope.joined = true;
                        $scope.link = window.location.href;
                        if(data.turnStart.substring(0, 1) === '0'){
                            $scope.turnStartDate = null;
                        }else{
                            $scope.turnStartDate = new Date(data.turnStart);
                            setCounter();
                        }
                    }
                }

                function setPastChoices(){
                    if($scope.pastChoices.length + 2 === $scope.pastChoicesLen){
                        $scope.pastChoices.push($scope.penultimateChoices[0], $scope.penultimateChoices[1]);
                    } else if($scope.pastChoices.length !== $scope.pastChoicesLen){
                        //gone out of sync somehow, rejoin!
                        join();
                    }
                }

                function setWins(){
                    $scope.wins = $scope.wins || [0, 0];

                    var pc = $scope.pastChoices;
                    var pcLen = pc.length;

                    if(pastChoicesLenAtLastSetWin == pcLen) return;

                    for(var i = pastChoicesLenAtLastSetWin; i < pcLen; i += 2){
                        var p1Result = $scope.getP1Result(pc[i], pc[i + 1]);

                        if(p1Result === 0) continue;

                        if(p1Result === 1){
                            $scope.wins[0] += 1;
                        }else{
                            $scope.wins[1] += 1;
                        }
                    }

                    pastChoicesLenAtLastSetWin = pcLen;
                }

                function setCounter(){
                    clearTimeout(counterTimeout);
                    if($scope.state === $scope._DEACTIVATED){
                        $scope.counter = null;
                        return;
                    }
                    var now = (new Date()).getTime();
                    var turnStart = $scope.turnStartDate.getTime();
                    var counter = turnStart - now;
                    var remainder;
                    if(counter < 0) {
                        if(counter > -1 * $scope.turnLength && $scope.state === $scope._GAME_IN_PROGRESS) {
                            counter = $scope.turnLength + counter;
                        }else{
                            counter = $scope.turnLength + $scope.rematchTimeLimit + counter;
                        }
                    }
                    remainder = counter % 1000;
                    counter -= remainder - 1000;
                    $scope.counter = counter / 1000;
                    counterTimeout = setTimeout(setCounter, remainder + 100);
                }

                join();
            }])
            .directive('cpGame', function(){
                return {restrict: 'E', template: tpl};
            });
    }
});