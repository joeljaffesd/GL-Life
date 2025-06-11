#version 300 es

precision mediump float;

uniform int uNumParticles; // Number of particles to simulate
uniform vec2 uResolution; // Canvas resolution
uniform sampler2D uParameters;

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
  int parameterX = int(vTexCoord.x * uResolution.x);
  int parameterY = int(vTexCoord.y * uResolution.y);

  // investigate how to possibly populate from sketch,
  // current behavior is that particles get "angrier" over time.
  vec2 seed = texelFetch(uParameters, ivec2(parameterX, parameterY), 0).xy;

  float scale = 1.0;

  float force = map(random(seed), 0.0, 1.0, scale * 0.003, scale * 0.01);
  if (random(vTexCoord) > 0.5) { force *= -1.0; } // invert half of forces

  float minDistance = map(random(seed), 0.0, 1.0, scale * 0.05, scale * 0.1);

  float radius = map(random(seed), 0.0, 1.0, scale * 0.15, scale * 0.5);

  // R = forces, G = minDistances, B = radii, A = unused
  fragColor = vec4(force, minDistance, radius, 0.0);
}