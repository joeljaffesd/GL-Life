// Fragment Shader (shader.frag)
// This shader applies a simple color gradient based on texture coordinates.

precision mediump float;

varying vec2 vTexCoord;
uniform sampler2D uPrevious;
uniform bool uFirst;

void main() {
  if (uFirst) {
    gl_FragColor = vec4(vTexCoord.x, vTexCoord.y, 0.5, 1.0);
  } else {
    // Sample the previous frame's texture
    vec4 previousColor = texture2D(uPrevious, vTexCoord);
    vec3 prevRGB = previousColor.rgb;

    // Blend the current gradient with the previous frame's color
    vec3 incrementedColor = prevRGB + vec3(0.01, 0.01, 0.01); // Increment color values
    incrementedColor = mod(incrementedColor, vec3(1.0)); // Wrap values to stay within [0.0, 1.0]
    gl_FragColor = vec4(incrementedColor, 0.0);
  }
}