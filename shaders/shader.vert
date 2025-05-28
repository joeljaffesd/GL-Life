#version 300 es

// Vertex Shader (shader.vert)
// This shader passes the vertex position and texture coordinates to the fragment shader.

in vec3 aPosition;
in vec2 aTexCoord;

out vec2 vTexCoord;

void main() {
  vTexCoord = aTexCoord;
  gl_Position = vec4(aPosition, 1.0);
}