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

function draw() {
  // First pass: render to the offscreen framebuffer, writing the sawtooth pattern.
  next.begin();
  shader(shaderProgram);
  shaderProgram.setUniform("uPrevious", previous);
  shaderProgram.setUniform("uFirst", first);
  shaderProgram.setUniform("uDisplay", false);
  quad(-1, -1, 1, -1, 1, 1, -1, 1);
  next.end();
  first = false; // set first to false after first pass
  
  // Second pass: render the feedback to the canvas, applying waveshaping.
  shader(shaderProgram);
  shaderProgram.setUniform("uPrevious", next);
  shaderProgram.setUniform("uFirst", false);
  shaderProgram.setUniform("uDisplay", true);
  quad(-1, -1, 1, -1, 1, 1, -1, 1);
  
  // Swap buffers for next frame
  [previous, next] = [next, previous];
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
