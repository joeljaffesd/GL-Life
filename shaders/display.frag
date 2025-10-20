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
uniform sampler2D uStrokeConnectivityTexture; // Stroke connectivity data texture
uniform float uStrokeTextureSize; // Size of stroke texture (e.g., 100 for 100x100)

// In GLSL 300 ES, the varying keyword is replaced with in/out
in vec2 vTexCoord;

// In GLSL 300 ES, we need to declare our output
out vec4 fragColor;

// Calculate distance from point to line segment
float distanceToLineSegment(vec2 point, vec2 lineStart, vec2 lineEnd, float lineWidth) {
  vec2 line = lineEnd - lineStart;
  float lineLength = length(line);
  
  if (lineLength < 0.001) {
    // Degenerate line, treat as point
    return length(point - lineStart);
  }
  
  // Project point onto line
  float t = clamp(dot(point - lineStart, line) / (lineLength * lineLength), 0.0, 1.0);
  vec2 projection = lineStart + t * line;
  
  // Distance from point to closest point on line segment
  float distanceToLine = length(point - projection);
  
  // Return distance adjusted for line width
  return max(0.0, distanceToLine - lineWidth * 0.5);
}

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
    
    // Sample stroke data from both textures
    vec4 strokeData = texture(uStrokeTexture, strokeTexCoord);
    vec4 connectivityData = texture(uStrokeConnectivityTexture, strokeTexCoord);
    
    // Extract stroke information from main texture
    vec2 strokePos = strokeData.rg; // Position
    float strokeType = strokeData.b; // Type
    float validFlag = strokeData.a;  // Valid flag and main point indicator
    bool isMainPoint = validFlag > 0.75; // Main points have alpha > 0.75
    
    // Skip invalid stroke particles
    if (validFlag < 0.25) {
      continue;
    }
    
    // Extract connectivity information
    vec2 nextPos = connectivityData.rg; // Next point position
    float strokeProgress = connectivityData.b; // Progress along stroke (0-1)
    bool hasNext = connectivityData.a > 0.5; // Has next point
    
    // Choose color based on stroke type
    vec3 color;
    int type = int(mod(strokeType * float(uNumTypes), float(uNumTypes)));
    
    if(type == 0) color = vec3(1.0, 0.3, 0.3); // Red
    else if(type == 1) color = vec3(0.3, 1.0, 0.3); // Green
    else if(type == 2) color = vec3(0.3, 0.3, 1.0); // Blue
    else if(type == 3) color = vec3(1.0, 1.0, 0.3); // Yellow
    else if(type == 4) color = vec3(1.0, 0.3, 1.0); // Magenta
    else color = vec3(0.3, 1.0, 1.0); // Cyan
    
    // Render stroke particle
    float distance = length((pixelPos - strokePos) * uResolution);
    float strokeSize = uParticleSize * (isMainPoint ? 2.0 : 1.2);
    
    if(distance < strokeSize) {
      float edge = strokeSize - 1.0;
      float alpha = isMainPoint ? 0.9 : 0.6;
      
      if(distance > edge) {
        alpha *= (1.0 - (distance - edge));
      }
      
      fragColor = vec4(mix(fragColor.rgb, color, alpha), 1.0);
    }
    
    // Draw connecting line to next point (only for main points with valid next points)
    if (isMainPoint && hasNext && nextPos.x > 0.0 && nextPos.y > 0.0) {
      float lineWidth = uParticleSize * 0.8;
      float distToLine = distanceToLineSegment(pixelPos, strokePos, nextPos, lineWidth / max(uResolution.x, uResolution.y));
      
      // Convert distance to screen space
      float screenDistToLine = distToLine * max(uResolution.x, uResolution.y);
      
      if (screenDistToLine < lineWidth) {
        // Create smooth line with anti-aliasing
        float lineAlpha = 1.0 - smoothstep(lineWidth * 0.5, lineWidth, screenDistToLine);
        
        // Vary line opacity based on stroke progress (fade at ends)
        float progressFade = 1.0 - abs(strokeProgress - 0.5) * 0.4;
        lineAlpha *= progressFade * 0.7;
        
        fragColor = vec4(mix(fragColor.rgb, color, lineAlpha), 1.0);
      }
    }
  }
  
}