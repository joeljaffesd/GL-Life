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
  // Use the shader program
  shader(shaderProgram);

  // set uniforms
  shaderProgram.setUniform("uPrevious", previous);
  shaderProgram.setUniform("uFirst", first);

  [previous, next] = [next, previous]; // buffer swap
  quad(-1, -1, 1, -1, 1, 1, -1, 1); // canvas
  first = false; // first flag
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
