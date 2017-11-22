var OBJ;

function initGL(canvas) {
  var gl = null;
  try {
    // Try to grab the standard context. If it fails, fallback to experimental.
    gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    gl.viewportWidth = canvas.width;
    gl.viewportHeight = canvas.height;
  } catch(e) {}

  // If we don't have a GL context, give up now
  if (!gl) {
    alert("Unable to initialize WebGL. Your browser may not support it.");
  }
  return gl;
}

// the webgl context
var gl;
// init the context
var canvas = document.getElementById("glcanvas");
initGL(canvas);
// a container variable (like a namespace protector)
var app = {};
app.meshes = {};
$(document).ready(function(){
    OBJ.downloadMeshes(
        {
            'suzanne': 'https://raw.githubusercontent.com/opengl-tutorials/ogl/master/misc05_picking/suzanne.obj',
        },
        webGLStart
    );
});

function webGLStart( meshes ){
     app.meshes = meshes;
     initBuffers();
     
}

function initBuffers(){
     OBJ.initMeshBuffers( gl, app.meshes.suzanne );
     
}