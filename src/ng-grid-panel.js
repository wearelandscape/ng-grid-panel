/**
 * @license ngGridPanel
 * (c) 2014 Hacklone https://github.com/Hacklone
 * License: MIT
 */
angular.module('ngGridPanel', ['ngAnimate'])
.directive('gridPanel', ['$animate', '$compile', '$window', '$document', '$timeout', function($animate, $compile, $window, $document, $timeout) {
  return {
    restrict: 'AE',
    scope: {
      onPanelOpened: '&',
      onPanelClosed: '&',
      onPanelUpdate: '&'
    },
    compile: function(tElement, tAttr) {
      var windowElement = angular.element($window);
      var htmlAndBodyElement = angular.element($document).find('html, body');

      var gridItemTemplate = getGridItemTemplate();
      var gridItemLastTemplate = getGridItemLastTemplate();
      var gridPanelTemplate = getGridPanelTemplate();

      if (!tAttr.repeat) {
        throw new Error('repeat attribute must be set');
      }

      var matchArray = tAttr.repeat.match(/\s?(.*)\sin\s(.*)\s?/);
      if (!matchArray || matchArray.length < 3) {
        throw new Error('repeat attribute must be set like repeat="item in items"');
      }

      var iterationVariableName = matchArray[1];
      var collectionName = matchArray[2];

      var panel;
      var panelOpenedAfter;
      var panelScope;

      var itemScopes = [];
      var itemElements = [];

      return {
        pre: function($scope, $element) {
          _init();
          function _init() {
            $element.empty();
            $scope.$parent.$watchCollection(collectionName, _onItemsChanged);

            var gridItemLast = gridItemLastTemplate.clone();
            $animate.enter(gridItemLast, $element);
            $compile(gridItemLast)($scope.$new(false, $scope.$parent));
          }

          function _onItemsChanged(items) {
            // TODO: remove only items that need to be removed
            // $element.empty()

            for (var i = 0, len = items.length; i < len; i++) {
              // create new element only if needed
              if (itemElements[i] === undefined) {
                itemScopes[i] = $scope.$new(false, $scope.$parent);
                itemScopes[i][iterationVariableName] = items[i];

                itemElements[i] = gridItemTemplate.clone();

                itemElements[i].addClass('grid-panel-item-' + i).on('click', (function(i, item) {
                  return function() {
                    _onGridItemClick(i, item);
                  };
                })(i, items[i]));

                if (i === 0) {
                  $animate.enter(itemElements[i], $element);
                } else {
                  $animate.enter(itemElements[i], $element, itemElements[i-1]);
                }


                $compile(itemElements[i])(itemScopes[i]);
              } else {
                itemScopes[i][iterationVariableName] = items[i];
                // $animate.enter(itemElements[i], $element);
              }
            }

            // delete elements that are no longer used
            for (var i = items.length-1; i < itemElements.length; i++) {
              $animate.leave(itemElements[i]);
              itemElements.splice(i,1);
            }

            // $compile(gridItemLastTemplate.clone())($scope);
          }

          var previousGridItemIndex;
          var gridItemIndex;
          function _onGridItemClick(index, item) {
            previousGridItemIndex = gridItemIndex;
            gridItemIndex = index;

            var gridItem = $element.find('.grid-panel-item-' + index);

            var lastGridItem = getLastGridItem(gridItem);
            var lastGridItemClass = lastGridItem.attr('class');

            if (panel && previousGridItemIndex === gridItemIndex) {
              // if the same tile is selected again, close the panel
              return closePanel();
            } else if (panel && panelOpenedAfter === lastGridItemClass) {
              updatePanel();
            } else {
              addPanel();
            }

            updateTriangle();

            scrollToPanel();

            function getLastGridItem(gridItem) {
              var current = gridItem;
              var next = gridItem.next();

              while (next.length && current.offset().top === next.offset().top) {
                current = next;

                next = current.next();
              }

              return current;
            }

            function addPanel() {
              panelOpenedAfter = lastGridItemClass;

              var isNewPanel = !!panel;

              closePanel();

              panelScope = $scope.$new(false, $scope.$parent);

              panel = gridPanelTemplate.clone();

              panel.find('.close-x').on('click', (function onClick(item) {
                return function() {
                  closePanel();

                  $scope.onPanelClosed({
                    item: item
                  });
                };
              })(item));

              $animate.enter(panel, null, lastGridItem);

              $compile(panel)(panelScope);
              updatePanel();

              $scope.onPanelOpened({
                item: item
              });
            }

            function updatePanel() {
              panelScope[iterationVariableName] = item;
              panelScope.$digest();
              $scope.onPanelUpdate({
                item: item
              });
            }

            function closePanel() {
              if (panel) {
                $animate.leave(panel);
                panel = undefined;
              }

              if (panelScope) {
                panelScope.$destroy();
                panelScope = undefined;
              }

              $scope.$digest();
            }

            function scrollToPanel() {
              if (!panel) {
                return;
              }

              var scrollAnimate = function scrollAnimate() {
                var panelOffset = panel.offset().top;

                var panelTop = panel.offset().top;
                var panelHeight = panel.outerHeight(true);
                var panelBottom = panelTop + panelHeight;

                var windowTop = windowElement.scrollTop();
                var windowHeight = windowElement.height();
                var windowBottom = windowTop + windowHeight;

                if (panelTop > windowTop + 200) {
                  htmlAndBodyElement.animate({
                    scrollTop: panelTop - 200
                  }, 200);
                } else if (panelBottom < windowBottom - 200) {
                  htmlAndBodyElement.animate({
                    scrollTop: panelTop - 200
                  }, 200);
                }
              }; // function scrollAnimate

              $timeout(scrollAnimate, 350);
            } // function scrollToPanel

            function updateTriangle() {
              if (!panel) {
                return;
              }

              panel.find('.triangle').css({
                left: gridItem.position().left + (gridItem.width() / 2)
              });
            }
          }
        }
      };

      function getGridItemTemplate() {
        var gridItemTemplate = tElement.find('grid-panel-item:first, .grid-panel-item').clone();
        if (!gridItemTemplate.length) {
          throw new Error('grid-panel-item template must be set');
        }

        return gridItemTemplate;
      }

      function getGridItemLastTemplate() {
        var gridItemLast = tElement.find('grid-panel-last:first, .grid-panel-last').clone();
        if (!gridItemLast.length) {
          throw new Error('grid-panel-item template must be set');
        }

        return gridItemLast;
      }

      function getGridPanelTemplate() {
        var gridPanelTemplate = tElement.find('grid-panel-content, .grid-panel-content').clone();
        if (!gridPanelTemplate.length) {
          throw new Error('grid-panel-content template must be set');
        }

        gridPanelTemplate
          .prepend(angular.element('<div class="close-x">'))
          .prepend(angular.element('<div class="triangle">'));

        return gridPanelTemplate;
      }
    }
  };
}]);
