/* Shared mouse convention: left orbit; right / Shift+left screen-space pan. */
(function () {
  'use strict';
  window.Navigation3D = {
    isPan: function (event) { return event.button === 2 || (event.button === 0 && event.shiftKey); },
    configureOrbit: function (controls) {
      controls.rotateSpeed = Math.abs(controls.rotateSpeed || 1);
      controls.enablePan = true;
      controls.screenSpacePanning = true;
      controls.mouseButtons = { LEFT: 0, MIDDLE: 1, RIGHT: 2 };
      return controls;
    },
    pan: function (camera, target, element, dx, dy) {
      camera.updateMatrixWorld();
      var height = Math.max(1, element.clientHeight);
      var scale = camera.isOrthographicCamera
        ? (camera.top - camera.bottom) / camera.zoom / height
        : 2 * camera.position.distanceTo(target) * Math.tan(camera.fov * Math.PI / 360) / height;
      var right = target.clone().setFromMatrixColumn(camera.matrixWorld, 0);
      var up = target.clone().setFromMatrixColumn(camera.matrixWorld, 1);
      target.addScaledVector(right, -dx * scale).addScaledVector(up, dy * scale);
    }
  };
  document.addEventListener('contextmenu', function (event) {
    if (event.target.closest('canvas, #scene')) event.preventDefault();
  });
})();
