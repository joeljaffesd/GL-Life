#version 300 es
// Fragment Shader (display.frag)

precision mediump float;

// Simulation state texture (1000x1 particles)
uniform sampler2D uSimState;
uniform vec2 uResolution;  // Canvas resolution
uniform float uParticleSize; // Size of particles (radius)
uniform int uNumParticles; // Number of particles
uniform int uNumTypes; // Number of particle types (e.g., 6)

// In GLSL 300 ES, the varying keyword is replaced with in/out
in vec2 vTexCoord;

// In GLSL 300 ES, we need to declare our output
out vec4 fragColor;

void main() {
  // Start with black background
  fragColor = vec4(0.0, 0.0, 0.0, 1.0);
  
  // Current pixel position in normalized [0,1] coordinates
  vec2 pixelPos = vTexCoord;
  
  // Loop through all particles
  for(int i = 0; i < uNumParticles; i++) { 
    
    // Use texelFetch to access exact particle data without interpolation
    vec4 particleData = texelFetch(uSimState, ivec2(i, 0), 0);
    
    vec2 particlePos = particleData.rg; // RG channels contain position
    float particleType = particleData.a; // Assuming A contains type
    
    // Calculate distance from current pixel to particle center
    float distance = length((pixelPos - particlePos) * uResolution);
    
    // If pixel is inside the particle radius, color it
    if(distance < uParticleSize) {
      // Choose color based on particle type
      vec3 color;
      
      // Map particle type to a color (using modulo for safety)
      // Use uNumTypes (e.g., 6) instead of uNumParticles for color mapping
      int type = int(mod(particleType * float(uNumTypes), float(uNumTypes)));
      
      if(type == 0) color = vec3(1.0, 0.2, 0.2); // Red
      else if(type == 1) color = vec3(0.2, 1.0, 0.2); // Green
      else if(type == 2) color = vec3(0.2, 0.2, 1.0); // Blue
      else if(type == 3) color = vec3(1.0, 1.0, 0.2); // Yellow
      else if(type == 4) color = vec3(1.0, 0.2, 1.0); // Magenta
      else color = vec3(0.2, 1.0, 1.0); // Cyan
      
      // Add anti-aliasing by fading at the edges
      float edge = uParticleSize - 1.0;
      if(distance > edge) {
        float alpha = 1.0 - (distance - edge);
        fragColor = vec4(mix(fragColor.rgb, color, alpha), 1.0);
      } else {
        fragColor = vec4(color, 1.0);
      }
    }
  }
  
  // gl_FragColor is not used in GLSL 300 ES
  // We've already been writing to fragColor
}