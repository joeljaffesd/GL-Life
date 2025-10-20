#version 300 es
// Fragment Shader (display.frag)

precision mediump float;

uniform sampler2D uSimState; // Simulation state texture
uniform vec2 uResolution;  // Canvas resolution
uniform float uParticleSize; // Size of particles (radius)
uniform int uNumParticles; // Number of particles
uniform int uNumTypes; // Number of particle types (e.g., 6)

// Stroke uniforms - now using texture instead of arrays
uniform int uNumStrokes; // Number of stroke particles
uniform sampler2D uStrokeTexture; // Stroke particle data texture
uniform float uStrokeTextureSize; // Size of stroke texture (e.g., 100 for 100x100)

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
  
  // Loop through stroke particles using texture sampling
  for(int i = 0; i < uNumStrokes && i < int(uStrokeTextureSize * uStrokeTextureSize); i++) {
    
    // Calculate texture coordinates for this stroke particle
    float texX = (float(i % int(uStrokeTextureSize)) + 0.5) / uStrokeTextureSize;
    float texY = (float(i / int(uStrokeTextureSize)) + 0.5) / uStrokeTextureSize;
    vec2 strokeTexCoord = vec2(texX, texY);
    
    // Sample stroke data from texture
    vec4 strokeData = texture(uStrokeTexture, strokeTexCoord);
    
    // Extract and decode stroke information from texture
    // Values are encoded as 0-255 in texture, need to convert back to 0-1
    vec2 strokePos = strokeData.rg; // Already normalized by texture sampling
    float strokeType = strokeData.b; // Already normalized by texture sampling
    float validFlag = strokeData.a;  // Already normalized by texture sampling
    
    // Skip invalid stroke particles (alpha < 0.5 means invalid)
    if (validFlag < 0.5) {
      continue;
    }
    
    // Calculate distance from current pixel to stroke particle
    float distance = length((pixelPos - strokePos) * uResolution);
    
    // Stroke particles are slightly larger and more opaque
    float strokeSize = uParticleSize * 1.5;
    
    if(distance < strokeSize) {
      // Choose color based on stroke type
      vec3 color;
      
      int type = int(mod(strokeType * float(uNumTypes), float(uNumTypes)));
      
      if(type == 0) color = vec3(1.0, 0.3, 0.3); // Red
      else if(type == 1) color = vec3(0.3, 1.0, 0.3); // Green
      else if(type == 2) color = vec3(0.3, 0.3, 1.0); // Blue
      else if(type == 3) color = vec3(1.0, 1.0, 0.3); // Yellow
      else if(type == 4) color = vec3(1.0, 0.3, 1.0); // Magenta
      else color = vec3(0.3, 1.0, 1.0); // Cyan
      
      // Make stroke particles more prominent
      float edge = strokeSize - 1.0;
      if(distance > edge) {
        float alpha = 1.0 - (distance - edge);
        fragColor = vec4(mix(fragColor.rgb, color, alpha * 0.8), 1.0);
      } else {
        fragColor = vec4(mix(fragColor.rgb, color, 0.8), 1.0);
      }
    }
  }
  
}