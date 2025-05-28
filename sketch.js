let simProgram, displayProgram;
let first = true;
let agentsPrev, agentsNext, display;

function preload() {
  simProgram = loadShader('shaders/shader.vert', 'shaders/simulation.frag');
  displayProgram = loadShader('shaders/shader.vert', 'shaders/display.frag');
}

function setup() {
  createCanvas(windowWidth, windowHeight, WEBGL);
  noStroke();

  const agentsOptions = {
    width: 1000,
    height: 1,
    textureFiltering: LINEAR,
    format: FLOAT,
  };

  const displayOptions = {
    textureFiltering: LINEAR,
    format: FLOAT,
  };

  agentsPrev = createFramebuffer(agentsOptions);
  agentsNext = createFramebuffer(agentsOptions);
  display = createFramebuffer(displayOptions);
}

function draw() {
  // First pass: render to the offscreen framebuffer, performing the simulation step.
  agentsNext.begin();
  shader(simProgram);
  simProgram.setUniform("uNumParticles", 1000);
  simProgram.setUniform("uNumTypes", 6);
  simProgram.setUniform("uPrevious", agentsPrev);
  simProgram.setUniform("uFirst", first);
  simProgram.setUniform("uResolution", [width, height]);
  quad(-1, -1, 1, -1, 1, 1, -1, 1);
  agentsNext.end();
  first = false; // set first to false after first pass
  
  // Second pass: render the agents to the display framebuffer.
  shader(displayProgram);
  displayProgram.setUniform("uSimState", agentsNext);
  displayProgram.setUniform("uNumTypes", 6);
  displayProgram.setUniform("uNumParticles", 1000);
  displayProgram.setUniform("uParticleSize", 5.0); // Adjust as needed
  displayProgram.setUniform("uResolution", [width, height]);
  quad(-1, -1, 1, -1, 1, 1, -1, 1);
  
  // Swap buffers for next frame
  [agentsPrev, agentsNext] = [agentsNext, agentsPrev];
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
