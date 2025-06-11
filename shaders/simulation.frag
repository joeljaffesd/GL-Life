#version 300 es
// Simulation Fragment Shader (simulation.frag)
// On first pass: Initialize particles with random positions
// On subsequent passes: Maintain those positions (sample and hold)

precision mediump float;

// Input uniform for previous state
uniform sampler2D uPrevious;
uniform bool uFirst;  // Flag for first pass
uniform int uNumParticles; // Number of particles to simulate
uniform vec2 uResolution; // Canvas resolution

// In GLSL 300 ES, the varying keyword is replaced with in/out
in vec2 vTexCoord;

// In GLSL 300 ES, we need to declare our output
out vec4 fragColor;

// Random function - returns a pseudo-random value between 0 and 1
float random(vec2 st) {
  return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

// Map function
float map(float value, float inputMin, float inputMax, float outputMin, float outputMax) {
  return outputMin + (outputMax - outputMin) * (value - inputMin) / (inputMax - inputMin);
}

void main() {
  // Get the current texel index - corresponds to particle index
  // (0, width - 1)
  int particleIndex = int(vTexCoord.x * uResolution.x);

  // get which layer we're on
  // (0, height - 1)
  int particleLayer = int(vTexCoord.y * uResolution.y);

  if (uFirst) {
    
    if (particleLayer == 0) { // position layer
      // First pass: initialize with random positions
      // Generate a unique seed for this particle
      vec2 seed = vec2(float(particleIndex) * 0.01, float(particleIndex) * 0.02);
      
      // Random position in [0,1] range
      float posX = random(seed);
      float posY = random(seed + vec2(1.0, 2.0));
      
      // Random particle type (between 0 and 1, will be mapped to discrete types)
      float particleType = random(seed + vec2(3.0, 4.0));
      
      // Store: RG = position, B = unused, A = particle type
      fragColor = vec4(posX, posY, 0.0, particleType);
    } 
    else { // velocity layer
      // Store: RG = 0-init'd velocity, B = unused, A = unused
      fragColor = vec4(0.0);
    }

  } 

  else { // if !first 

    // get previous state for this particle
    vec4 prevPosState = texelFetch(uPrevious, ivec2(particleIndex, 0), 0);
    vec4 prevVelState = texelFetch(uPrevious, ivec2(particleIndex, 1), 0);

    vec2 particlePos = prevPosState.xy;
    vec2 particleVel = prevVelState.xy;

    if (particleLayer == 1) { // velocity layer

      // sim step
      vec2 direction = vec2(0.0);
      vec2 totalForce = vec2(0.0); // test
      vec2 acceleration = vec2(0.0);
      float distance = 0.0;

      // loop over all particles
      for (int i = 0; i < uNumParticles; i++) {

        // skip if self
        if (i == particleIndex) {
          continue;
        } 

        vec4 otherAgent = texelFetch(uPrevious, ivec2(i, 0), 0);

        direction = otherAgent.xy;
        direction -= particlePos;

        // TODO: toroidal stuff

        // ok... 
        distance = length(direction);
        direction = normalize(direction);

        // TODO: minDistances, Radii   
        if (distance < 0.075) {
          vec2 force = direction;
          force *= abs(0.0075 * -3.0);
          force *= map(distance, 0.0, 0.075, 1.0, 0.0);
          force *= 0.05;
          totalForce += force;
        }

        if (distance < 0.35) {
          vec2 force = direction;
          force *= 0.0075;
          force *= map(distance, 0.0, 0.35, 0.0, 1.0);
          force *= 0.05;
          totalForce += force;
        }

      }

      // integration
      acceleration += totalForce;
      particleVel += acceleration;
      particleVel *= 0.3; // friction 

      // output state
      prevVelState.xy = particleVel;
      fragColor = prevVelState;

    } 
    else { // position layer

      // sanity check sim
      // prevPos.y += prevVel.y; // "simulation"
      // prevPos.y += prevVel; // "simulation"

      // real sim
      particlePos += particleVel;

      // Toroidal wrapping
      //======================================== 
      particlePos = fract(particlePos);
      //======================================== 

      // update positons
      prevPosState.xy = particlePos;

      // Output state
      fragColor = prevPosState;
    }

  }
}