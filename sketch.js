let shaderProgram;

function preload() {
  // Load the vertex and fragment shaders from the shaders directory
  shaderProgram = loadShader('shaders/shader.vert', 'shaders/shader.frag');
}

function setup() {
  createCanvas(windowWidth, windowHeight, WEBGL);
  noStroke();
}

function draw() {
  // Use the shader program
  shader(shaderProgram);

  // Draw a rectangle that covers the entire canvas
  // rect(-width * 5, -height * 5, width * 5, height * 5); // Aligns the rectangle with the canvas
  quad(-1, -1, 1, -1, 1, 1, -1, 1)
}
