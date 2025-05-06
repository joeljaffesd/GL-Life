let shaderProgram;
let first = true;
let next, previous;

function preload() {
  // Load the vertex and fragment shaders from the shaders directory
  shaderProgram = loadShader('shaders/shader.vert', 'shaders/shader.frag');
}

function setup() {
  createCanvas(windowWidth, windowHeight, WEBGL);
  noStroke();

  const options = {
    textureFiltering: LINEAR,
    format: FLOAT,
  };
  previous = createFramebuffer(options);
  next = createFramebuffer(options);
}

// function draw() {
//   // Use the shader program
//   shader(shaderProgram);

//   // set uniforms
//   shaderProgram.setUniform("uPrevious", previous);
//   shaderProgram.setUniform("uFirst", first);

//   quad(-1, -1, 1, -1, 1, 1, -1, 1); // canvas
//   [previous, next] = [next, previous]; // buffer swap
//   first = false; // first flag
// }

function draw() {
  // First, render to the next framebuffer
  next.begin();
  shader(shaderProgram);
  shaderProgram.setUniform("uPrevious", previous);
  shaderProgram.setUniform("uFirst", first);
  quad(-1, -1, 1, -1, 1, 1, -1, 1);
  next.end();
  
  // Then render to canvas (display the result)
  shader(shaderProgram);
  shaderProgram.setUniform("uPrevious", next);
  shaderProgram.setUniform("uFirst", false);
  quad(-1, -1, 1, -1, 1, 1, -1, 1);
  
  // Swap buffers for next frame
  [previous, next] = [next, previous];
  first = false;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
