// Global variable definitionvar canvas;
var canvas;
var gl;
var shaderProgram;


// Buffers
var worldVertexPositionBuffer = null;
var worldVertexTextureCoordBuffer = null;
// Buffers
var cubeVertexPositionBuffer;
var cubeVertexTextureCoordBuffer;
var cubeVertexIndexBuffer;


// Model-view and projection matrix and model-view matrix stack
var mvMatrixStack = [];
var mvMatrix = mat4.create();
var pMatrix = mat4.create();

// Variables for storing textures
var floorTexture;
// Variables for storing textures
var cubeTexture;

//Gift positions
var gift_size = 0.07;
var removed_gifts = 0;
var gift_positions = new Array();
gift_positions[0] = new Array();
gift_positions[1] = new Array();
gift_positions[2] = new Array();
gift_positions[3] = new Array();
gift_positions[4] = new Array();

var x1 = 0;
var z1 = -2;
var x2 = 2;
var z2 = -5;
var x3 = 1.2;
var z3 = -4;
var x4 = 3;
var z4 = 4;
var x5 = -4;
var z5 = -3;

// gift_positions[0][0] = -xPosition;
// gift_positions[0][1] = -yPosition+gift_size;
// gift_positions[0][2] = -zPosition+2;

// gift_positions[1][0] = -xPosition-2;
// gift_positions[1][1] = -yPosition+gift_size;
// gift_positions[1][2] = -zPosition+5;

// gift_positions[2][0] = -xPosition-1.2;
// gift_positions[2][1] = -yPosition+gift_size;
// gift_positions[2][2] = -zPosition+4;


// Variable that stores  loading state of textures.
var texturesLoaded = false;

// Keyboard handling helper variable for reading the status of keys
var currentlyPressedKeys = {};

// Variables for storing current position and speed
var pitch = 0;
var pitchRate = 0;
var yaw = 0;
var yawRate = 0;
var xPosition = 0;
var yPosition = 0.4;
var zPosition = 0;
var speed = 0;

// Used to make us "jog" up and down as we move forward.
var joggingAngle = 0;

// Helper variable for animation
var lastTime = 0;

//
// Matrix utility functions
//
// mvPush   ... push current matrix on matrix stack
// mvPop    ... pop top matrix from stack
// degToRad ... convert degrees to radians
//
function mvPushMatrix() {
  var copy = mat4.create();
  mat4.set(mvMatrix, copy);
  mvMatrixStack.push(copy);
}

function mvPopMatrix() {
  if (mvMatrixStack.length == 0) {
    throw "Invalid popMatrix!";
  }
  mvMatrix = mvMatrixStack.pop();
}

function degToRad(degrees) {
  return degrees * Math.PI / 180;
}

//
// initGL
//
// Initialize WebGL, returning the GL context or null if
// WebGL isn't available or could not be initialized.
//
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

//
// getShader
//
// Loads a shader program by scouring the current document,
// looking for a script with the specified ID.
//
function getShader(gl, id) {
  var shaderScript = document.getElementById(id);

  // Didn't find an element with the specified ID; abort.
  if (!shaderScript) {
    return null;
  }

  // Walk through the source element's children, building the
  // shader source string.
  var shaderSource = "";
  var currentChild = shaderScript.firstChild;
  while (currentChild) {
    if (currentChild.nodeType == 3) {
        shaderSource += currentChild.textContent;
    }
    currentChild = currentChild.nextSibling;
  }

  // Now figure out what type of shader script we have,
  // based on its MIME type.
  var shader;
  if (shaderScript.type == "x-shader/x-fragment") {
    shader = gl.createShader(gl.FRAGMENT_SHADER);
  } else if (shaderScript.type == "x-shader/x-vertex") {
    shader = gl.createShader(gl.VERTEX_SHADER);
  } else {
    return null;  // Unknown shader type
  }

  // Send the source to the shader object
  gl.shaderSource(shader, shaderSource);

  // Compile the shader program
  gl.compileShader(shader);

  // See if it compiled successfully
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    alert(gl.getShaderInfoLog(shader));
    return null;
  }

  return shader;
}

//
// initShaders
//
// Initialize the shaders, so WebGL knows how to light our scene.
//
function initShaders() {
  var fragmentShader = getShader(gl, "shader-fs");
  var vertexShader = getShader(gl, "shader-vs");

  // Create the shader program
  shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  // If creating the shader program failed, alert
  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    alert("Unable to initialize the shader program.");
  }

  // start using shading program for rendering
  gl.useProgram(shaderProgram);

  // store location of aVertexPosition variable defined in shader
  shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");

  // turn on vertex position attribute at specified position
  gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

  // store location of aVertexNormal variable defined in shader
  shaderProgram.textureCoordAttribute = gl.getAttribLocation(shaderProgram, "aTextureCoord");

  // store location of aTextureCoord variable defined in shader
  gl.enableVertexAttribArray(shaderProgram.textureCoordAttribute);

  // store location of uPMatrix variable defined in shader - projection matrix
  shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
  // store location of uMVMatrix variable defined in shader - model-view matrix
  shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
  // store location of uSampler variable defined in shader
  shaderProgram.samplerUniform = gl.getUniformLocation(shaderProgram, "uSampler");
}

//
// setMatrixUniforms
//
// Set the uniforms in shaders.
//
function setMatrixUniforms() {
  gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, pMatrix);
  gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
}

//
// initTextures
//
// Initialize the textures we'll be using, then initiate a load of
// the texture images. The handleTextureLoaded() callback will finish
// the job; it gets called each time a texture finishes loading.
//
function initTextures() {
  floorTexture = gl.createTexture();
  floorTexture.image = new Image();
  floorTexture.image.onload = function () {
    handleTextureLoaded(floorTexture)
  }
  floorTexture.image.src = "./assets/grass1.jpg";

  cubeTexture = gl.createTexture();
  cubeTexture.image = new Image();
  cubeTexture.image.onload = function() {
    handleTextureLoaded(cubeTexture);
  };  // async loading
  cubeTexture.image.src = "./assets/gifft.jpg";
}

function handleTextureLoaded(texture) {
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

  // Third texture usus Linear interpolation approximation with nearest Mipmap selection
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture.image);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.generateMipmap(gl.TEXTURE_2D);

  gl.bindTexture(gl.TEXTURE_2D, null);

  // when texture loading is finished we can draw scene.
  texturesLoaded = true;
}

//
// initBuffers
//
// Initialize the buffers we'll need. For this demo, we just have
// one object -- a simple cube.
//
function initBuffers() {
  // Create a buffer for the cube's vertices.
  cubeVertexPositionBuffer = gl.createBuffer();

  // Select the cubeVertexPositionBuffer as the one to apply vertex
  // operations to from here out.
  gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexPositionBuffer);

  // Now create an array of vertices for the cube.
  vertices = [
    // Front face
    -1.0, -1.0,  1.0,
     1.0, -1.0,  1.0,
     1.0,  1.0,  1.0,
    -1.0,  1.0,  1.0,

    // Back face
    -1.0, -1.0, -1.0,
    -1.0,  1.0, -1.0,
     1.0,  1.0, -1.0,
     1.0, -1.0, -1.0,

    // Top face
    -1.0,  1.0, -1.0,
    -1.0,  1.0,  1.0,
     1.0,  1.0,  1.0,
     1.0,  1.0, -1.0,

    // Bottom face
    -1.0, -1.0, -1.0,
     1.0, -1.0, -1.0,
     1.0, -1.0,  1.0,
    -1.0, -1.0,  1.0,

    // Right face
     1.0, -1.0, -1.0,
     1.0,  1.0, -1.0,
     1.0,  1.0,  1.0,
     1.0, -1.0,  1.0,

    // Left face
    -1.0, -1.0, -1.0,
    -1.0, -1.0,  1.0,
    -1.0,  1.0,  1.0,
    -1.0,  1.0, -1.0,
  ];

  // Now pass the list of vertices into WebGL to build the shape. We
  // do this by creating a Float32Array from the JavaScript array,
  // then use it to fill the current vertex buffer.
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
  cubeVertexPositionBuffer.itemSize = 3;
  cubeVertexPositionBuffer.numItems = 24;

  // Map the texture onto the cube's faces.
  cubeVertexTextureCoordBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexTextureCoordBuffer);

  // Now create an array of vertex texture coordinates for the cube.
  var textureCoordinates = [
    // Front
    0.0,  0.0,
    1.0,  0.0,
    1.0,  1.0,
    0.0,  1.0,
    // Back
    0.0,  0.0,
    1.0,  0.0,
    1.0,  1.0,
    0.0,  1.0,
    // Top
    0.0,  0.0,
    1.0,  0.0,
    1.0,  1.0,
    0.0,  1.0,
    // Bottom
    0.0,  0.0,
    1.0,  0.0,
    1.0,  1.0,
    0.0,  1.0,
    // Right
    0.0,  0.0,
    1.0,  0.0,
    1.0,  1.0,
    0.0,  1.0,
    // Left
    0.0,  0.0,
    1.0,  0.0,
    1.0,  1.0,
    0.0,  1.0
  ];

  // Pass the texture coordinates into WebGL
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoordinates), gl.STATIC_DRAW);
  cubeVertexTextureCoordBuffer.itemSize = 2;
  cubeVertexTextureCoordBuffer.numItems = 24;

  // Build the element array buffer; this specifies the indices
  // into the vertex array for each face's vertices.
  cubeVertexIndexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeVertexIndexBuffer);

  // This array defines each face as two triangles, using the
  // indices into the vertex array to specify each triangle's
  // position.
  var cubeVertexIndices = [
    0,  1,  2,      0,  2,  3,    // front
    4,  5,  6,      4,  6,  7,    // back
    8,  9,  10,     8,  10, 11,   // top
    12, 13, 14,     12, 14, 15,   // bottom
    16, 17, 18,     16, 18, 19,   // right
    20, 21, 22,     20, 22, 23    // left
  ];

  // Now send the element array to GL
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(cubeVertexIndices), gl.STATIC_DRAW);
  cubeVertexIndexBuffer.itemSize = 1;
  cubeVertexIndexBuffer.numItems = 36;
}

//
// handleLoadedWorld
//
// Initialisation of world
//
function handleLoadedWorld(data) {
  var lines = data.split("\n");
  var vertexCount = 0;
  var vertexPositions = [];
  var vertexTextureCoords = [];
  for (var i in lines) {
    var vals = lines[i].replace(/^\s+/, "").split(/\s+/);
    if (vals.length == 5 && vals[0] != "//") {
      // It is a line describing a vertex; get X, Y and Z first
      vertexPositions.push(parseFloat(vals[0]));
      vertexPositions.push(parseFloat(vals[1]));
      vertexPositions.push(parseFloat(vals[2]));

      // And then the texture coords
      vertexTextureCoords.push(parseFloat(vals[3]));
      vertexTextureCoords.push(parseFloat(vals[4]));

      vertexCount += 1;
    }
  }

  worldVertexPositionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, worldVertexPositionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexPositions), gl.STATIC_DRAW);
  worldVertexPositionBuffer.itemSize = 3;
  worldVertexPositionBuffer.numItems = vertexCount;

  worldVertexTextureCoordBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, worldVertexTextureCoordBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexTextureCoords), gl.STATIC_DRAW);
  worldVertexTextureCoordBuffer.itemSize = 2;
  worldVertexTextureCoordBuffer.numItems = vertexCount;

  document.getElementById("loadingtext").textContent = "";
}

//
// loadWorld
//
// Loading world
//
function loadWorld() {
  var request = new XMLHttpRequest();
  request.open("GET", "./assets/world.txt");
  request.onreadystatechange = function () {
    if (request.readyState == 4) {
      handleLoadedWorld(request.responseText);
    }
  }
  request.send();
}

//
// drawScene
//
// Draw the scene.
//
function drawScene() {
  // set the rendering environment to full canvas size
  gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
  // Clear the canvas before we start drawing on it.
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.clearColor(0.2, 0.3, 1, 0.3);

  // If buffers are empty we stop loading the application.
  if (worldVertexTextureCoordBuffer == null || worldVertexPositionBuffer == null) {
    return;
  }

  // Establish the perspective with which we want to view the
  // scene. Our field of view is 45 degrees, with a width/height
  // ratio of 640:480, and we only want to see objects between 0.1 units
  // and 100 units away from the camera.
  mat4.perspective(45, gl.viewportWidth / gl.viewportHeight, 0.1, 100.0, pMatrix);

  // Set the drawing position to the "identity" point, which is
  // the center of the scene.
  mat4.identity(mvMatrix);

  //mvPushMatrix();
  // Set the drawing position to the "identity" point, which is
  // the center of the scene.
  //mat4.identity(mvMatrix);


  //console.log(gift_positions.length);

  if (removed_gifts == gift_positions.length) {reset_gift_positions(); removed_gifts = 0;}

  //if (gift_positions[0][0] == null) {
    for (var i = 0; i < gift_positions.length; i+=1) {
      //for (var j = -8.0; j < 8.0; j+=1.0) {

        //console.log(i);
        //console.log("lolll");

        if (gift_positions[i][0] != 999) {
          mvPushMatrix();

          //var xT = (- Math.round(Math.random())) * Math.floor(Math.random() * 6) + 1;
          //var zT = Math.floor(Math.random() * 6) + 2;

          mat4.rotate(mvMatrix, degToRad(-pitch), [1, 0, 0]);
          mat4.rotate(mvMatrix, degToRad(-yaw), [0, 1, 0]);

          if (i == 0) {
            gift_positions[i][0] = -xPosition+x1;
            gift_positions[i][1] = -yPosition+gift_size;
            gift_positions[i][2] = -zPosition+z1;

          } else if (i == 1) {
            gift_positions[i][0] = -xPosition+x2;
            gift_positions[i][1] = -yPosition+gift_size;
            gift_positions[i][2] = -zPosition+z2;

          } else if (i == 2) {
            gift_positions[i][0] = -xPosition-x3;
            gift_positions[i][1] = -yPosition+gift_size;
            gift_positions[i][2] = -zPosition+z2;

          } else if (i == 3) {
            gift_positions[i][0] = -xPosition-x4;
            gift_positions[i][1] = -yPosition+gift_size;
            gift_positions[i][2] = -zPosition+z4;

          } else if (i == 4) {
            gift_positions[i][0] = -xPosition-x5;
            gift_positions[i][1] = -yPosition+gift_size;
            gift_positions[i][2] = -zPosition+z5;

          }


          mat4.translate(mvMatrix, [gift_positions[i][0], gift_positions[i][1], gift_positions[i][2]]);

          mat4.scale(mvMatrix, [gift_size, gift_size, gift_size]);


          // Draw the cube by binding the array buffer to the cube's vertices
          // array, setting attributes, and pushing it to GL.
          gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexPositionBuffer);
          gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, cubeVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);

          // Set the texture coordinates attribute for the vertices.
          gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexTextureCoordBuffer);
          gl.vertexAttribPointer(shaderProgram.textureCoordAttribute, cubeVertexTextureCoordBuffer.itemSize, gl.FLOAT, false, 0, 0);

          // Specify the texture to map onto the faces.
          gl.activeTexture(gl.TEXTURE0);
          gl.bindTexture(gl.TEXTURE_2D, cubeTexture);
          gl.uniform1i(shaderProgram.samplerUniform, 0);

          // Draw the cube.
          gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeVertexIndexBuffer);
          setMatrixUniforms();
          gl.drawElements(gl.TRIANGLES, cubeVertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);

          mvPopMatrix();

        } else {continue;}

      //}

    }

  //}


  //mvPopMatrix();
  // Now move the drawing position a bit to where we want to start
  // drawing the world.
  mat4.rotate(mvMatrix, degToRad(-pitch), [1, 0, 0]);
  mat4.rotate(mvMatrix, degToRad(-yaw), [0, 1, 0]);
  mat4.translate(mvMatrix, [-xPosition, -yPosition, -zPosition]);

  // Activate textures
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, floorTexture);
  gl.uniform1i(shaderProgram.samplerUniform, 0);

  // Set the texture coordinates attribute for the vertices.
  gl.bindBuffer(gl.ARRAY_BUFFER, worldVertexTextureCoordBuffer);
  gl.vertexAttribPointer(shaderProgram.textureCoordAttribute, worldVertexTextureCoordBuffer.itemSize, gl.FLOAT, false, 0, 0);

  // Draw the world by binding the array buffer to the world's vertices
  // array, setting attributes, and pushing it to GL.
  gl.bindBuffer(gl.ARRAY_BUFFER, worldVertexPositionBuffer);
  gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, worldVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);

  // Draw the cube.
  setMatrixUniforms();
  gl.drawArrays(gl.TRIANGLES, 0, worldVertexPositionBuffer.numItems);
}

//
// animate
//
// Called every time before redeawing the screen.
//
function animate() {
  //var num_of_crosses = 0;
  var timeNow = new Date().getTime();
  if (lastTime != 0) {
    var elapsed = timeNow - lastTime;

    if (speed != 0) {
      xPosition -= Math.sin(degToRad(yaw)) * speed * elapsed;
      //var xx = check_touched_gifts(0, xPosition);
      //if (xx >= 0) {num_of_crosses++;}

      zPosition -= Math.cos(degToRad(yaw)) * speed * elapsed;
      //var zz = check_touched_gifts(2, zPosition);
      //if (zz >= 0) {num_of_crosses++;}

      joggingAngle += elapsed * 0.6; // 0.6 "fiddle factor" - makes it feel more realistic :-)
      yPosition = Math.sin(degToRad(joggingAngle)) / 20 + 0.4;
      //var yy = check_touched_gifts(1, yPosition);
      //if (yy >= 0) {num_of_crosses++;}

      var ctg = check_touched_gifts(xPosition, yPosition, zPosition);
      if (ctg >= 0) {gift_positions[ctg][0] = 999; removed_gifts++; console.log("REMOVED GIFT: "+ctg)}

      //if (num_of_crosses == 2) {gift_positions[0][xx] = 999;}
    }

    yaw += yawRate * elapsed;
    pitch += pitchRate * elapsed;

  }
  lastTime = timeNow;
}

function check_touched_gifts (current_position_X, current_position_Y, current_position_Z) {
  //console.log("check_touched_gifts...");

  for (var i = 0; i < gift_positions.length; i++) {

    //console.log(current_position_X+", "+current_position_Y+", "+current_position_Z);
    //console.log(gift_positions[i][0]+", "+gift_positions[i][1]+", "+gift_positions[i][2]);

    // if (gift_positions[i][0] >= current_position_X && current_position_X <= gift_positions[i][0]+gift_size
    //     && gift_positions[i][1] >= current_position_Y && current_position_Y <= gift_positions[i][1]+gift_size
    //     && gift_positions[i][2] >= current_position_Z && current_position_Z <= gift_positions[i][2]+gift_size) {
    //   console.log("Gift "+i+" crossed.");
    //   return i;

    // }
    // console.log("nova:");
    // console.log(Math.abs(gift_positions[i][0] + current_position_X));
    // console.log(Math.abs(gift_positions[i][1] + current_position_Y));
    // console.log(Math.abs(gift_positions[i][2] + current_position_Z));

    if (i == 0) {
      console.log("nova:");
      console.log(Math.abs(gift_positions[i][0] + current_position_X));
      console.log(Math.abs(gift_positions[i][1] + current_position_Y));
      console.log(Math.abs(gift_positions[i][2] + current_position_Z));

      if (Math.abs(gift_positions[i][0] + current_position_X) <= Math.abs(x1) &&
          Math.abs(gift_positions[i][1] + current_position_Y) <= gift_size &&
          Math.abs(gift_positions[i][2] + current_position_Z) <= Math.abs(z1)) {
        console.log("Gift "+i+" crossed.");
        return i;

      }

    } else if (i == 1) {
      console.log("nova: "+i);
      console.log(Math.abs(gift_positions[i][0] + current_position_X));
      console.log(Math.abs(gift_positions[i][1] + current_position_Y));
      console.log(Math.abs(gift_positions[i][2] + current_position_Z));

      if (Math.abs(gift_positions[i][0] + current_position_X) <= Math.abs(x2) &&
          Math.abs(gift_positions[i][1] + current_position_Y) <= gift_size &&
          Math.abs(gift_positions[i][2] + current_position_Z) <= Math.abs(z2)) {
        console.log("Gift "+i+" crossed.");
        return i;

      }

    } else if (i == 2) {
      console.log("nova: "+i);
      console.log(Math.abs(gift_positions[i][0] + current_position_X));
      console.log(Math.abs(gift_positions[i][1] + current_position_Y));
      console.log(Math.abs(gift_positions[i][2] + current_position_Z));

      if (Math.abs(gift_positions[i][0] + current_position_X) <= Math.abs(x3) &&
          Math.abs(gift_positions[i][1] + current_position_Y) <= gift_size &&
          Math.abs(gift_positions[i][2] + current_position_Z) <= Math.abs(z3)) {
        console.log("Gift "+i+" crossed.");
        return i;

      }

    } else if (i == 3) {
      console.log("nova: "+i);
      console.log(Math.abs(gift_positions[i][0] + current_position_X));
      console.log(Math.abs(gift_positions[i][1] + current_position_Y));
      console.log(Math.abs(gift_positions[i][2] + current_position_Z));

      if (Math.abs(gift_positions[i][0] + current_position_X) <= Math.abs(x4) &&
          Math.abs(gift_positions[i][1] + current_position_Y) <= gift_size &&
          Math.abs(gift_positions[i][2] + current_position_Z) <= Math.abs(z4)) {
        console.log("Gift "+i+" crossed.");
        return i;

      }

    } else if (i == 4) {
      console.log("nova: "+i);
      console.log(Math.abs(gift_positions[i][0] + current_position_X));
      console.log(Math.abs(gift_positions[i][1] + current_position_Y));
      console.log(Math.abs(gift_positions[i][2] + current_position_Z));

      if (Math.abs(gift_positions[i][0] + current_position_X) <= Math.abs(x5) &&
          Math.abs(gift_positions[i][1] + current_position_Y) <= gift_size &&
          Math.abs(gift_positions[i][2] + current_position_Z) <= Math.abs(z5)) {
        console.log("Gift "+i+" crossed.");
        return i;

      }

    }

  }

  return -1;

}

function reset_gift_positions () {
  for (var i = 0; i < gift_positions.length; i++) {gift_positions[i][0] = 0;}
}

// COUNTDOWN
function countdown() {
    var seconds = 60;
    function tick() {
        var counter = document.getElementById("counter");
        
        var not_in_game = $('.modal').is(':hidden');
        if (not_in_game) {seconds--;}
        
        counter.innerHTML = "0:" + (seconds < 10 ? "0" : "") + String(seconds);
        
        if( seconds > 0 ) {setTimeout(tick, 1000);}
        else {
          alert("Čas je potekel, igre je konec.");
          
          if (confirm("Želite ponoviti igro na čas?")) {
              location.reload();
              
          } else { //NE DELA SE!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
            pitch = 0;
            pitchRate = 0;
            yaw = 0;
            yawRate = 0;
            speed = 0;
            
          }
      
        }
    }
    tick();
}

//
// Keyboard handling helper functions
//
// handleKeyDown    ... called on keyDown event
// handleKeyUp      ... called on keyUp event
//
function handleKeyDown(event) {
  // storing the pressed state for individual key
  currentlyPressedKeys[event.keyCode] = true;
}

function handleKeyUp(event) {
  // reseting the pressed state for individual key
  currentlyPressedKeys[event.keyCode] = false;
}

//
// handleKeys
//
// Called every time before redeawing the screen for keyboard
// input handling. Function continuisly updates helper variables.
//
function handleKeys() {
  if (currentlyPressedKeys[33]) {
    // Page Up
    pitchRate = 0.1;
  } else if (currentlyPressedKeys[34]) {
    // Page Down
    pitchRate = -0.1;
  } else {
    pitchRate = 0;
  }

  if (currentlyPressedKeys[37] || currentlyPressedKeys[65]) {
    // Left cursor key or A
    yawRate = 0.1;
  } else if (currentlyPressedKeys[39] || currentlyPressedKeys[68]) {
    // Right cursor key or D
    yawRate = -0.1;
  } else {
    yawRate = 0;
  }

  if (currentlyPressedKeys[38] || currentlyPressedKeys[87]) {
    // Up cursor key or W
    speed = 0.003;
  } else if (currentlyPressedKeys[40] || currentlyPressedKeys[83]) {
    // Down cursor key
    speed = -0.003;
  } else {
    speed = 0;
  }
}

//
// start
//
// Called when the canvas is created to get the ball rolling.
// Figuratively, that is. There's nothing moving in this demo.
//
function start() {

  //********************************************************************
  //var mesh = new OBJ.Mesh("./assets/cube.txt");

  // use the included helper function to initialize the VBOs
  // if you don't want to use this function, have a look at its
  // source to see how to use the Mesh instance.

  // have a look at the initMeshBuffers docs for an exmample of how to
  // render the model at this point

//**************************************************************************



  canvas = document.getElementById("glcanvas");

  gl = initGL(canvas);      // Initialize the GL context
  //OBJ.initMeshBuffers(gl, mesh);

  // Only continue if WebGL is available and working
  if (gl) {
    gl.clearColor(0.0, 0.0, 0.0, 1.0);                      // Set clear color to black, fully opaque
    gl.clearDepth(1.0);                                     // Clear everything
    gl.enable(gl.DEPTH_TEST);                               // Enable depth testing
    gl.depthFunc(gl.LEQUAL);                                // Near things obscure far things

    // Initialize the shaders; this is where all the lighting for the
    // vertices and so forth is established.
    initShaders();

    // Here's where we call the routine that builds all the objects
    // we'll be drawing.
    initBuffers();

    // Next, load and set up the textures we'll be using.
    initTextures();

    // Initialise world objects
    loadWorld();

    // Bind keyboard handling functions to document handlers
    document.onkeydown = handleKeyDown;
    document.onkeyup = handleKeyUp;
    
    countdown();

    // Set up to draw the scene periodically.
    setInterval(function() {
      if (texturesLoaded) { // only draw scene and animate when textures are loaded.
        document.getElementById("gifts-removed").innerHTML = removed_gifts;
        requestAnimationFrame(animate);
        handleKeys();
        drawScene();
      }
    }, 15);
  }
}
