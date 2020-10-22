const vertex = `#version 300 es
layout (location = 0) in vec3 aPosition;
layout (location = 1) in vec3 aNormal;
layout (location = 2) in vec2 aTexCoord;

uniform mat4 uViewModel;
uniform mat4 uProjection;

uniform float uAmbient;
uniform float uDiffuse;

uniform vec3 uLightDirection;
uniform vec3 uLightColor;

out vec2 vTexCoord;
flat out vec3 vLight;

void main() {

    // Calculate vertex position using view model matrix
    vec3 vertexPosition = (uViewModel * vec4(aPosition, 1)).xyz;

    // Use the Lambert's formula to calculate difuse lighting
    // Light direction is the direction from which the sun is shining
    vec3 L = normalize(-uLightDirection);
    vec3 N = normalize(aNormal);
    float lambert = max(0.0, dot(L, N));

    // The final vertex light is composed of ambient and lambert lighting
    vLight = uLightColor * lambert + uAmbient;

    vTexCoord = aTexCoord;
    gl_Position = uProjection * vec4(vertexPosition, 1);

}
`;

const fragment = `#version 300 es
precision mediump float;

uniform mediump sampler2D uTexture;

in vec2 vTexCoord;
flat in vec3 vLight;

out vec4 oColor;

void main() {
    oColor = texture(uTexture, vTexCoord) * vec4(vLight, 1);
}
`;

const grayscaleFragment = `#version 300 es
precision mediump float;

uniform mediump sampler2D uTexture;

in vec2 vTexCoord;
flat in vec3 vLight;

out vec4 oColor;

void main() {
    vec4 color = texture(uTexture, vTexCoord) * vec4(vLight, 1);
    float intensity = (color.x + color.y + color.z) / 3.0;
    oColor = vec4(intensity, intensity, intensity, color.w);
}
`;

const holographicVertex = `#version 300 es
layout (location = 0) in vec3 aPosition;

uniform mat4 uViewModel;
uniform mat4 uProjection;

uniform vec3 uColor;
out vec3 vColor;

void main() {
    vec3 vertexPosition = (uViewModel * vec4(aPosition, 1)).xyz;
    gl_Position = uProjection * vec4(vertexPosition, 1);
    vColor = uColor;
}
`;

const holographicFragment = `#version 300 es
precision mediump float;

in vec3 vColor;
out vec4 oColor;

void main() {
    oColor = vec4(vColor, 0.8);
}
`;

const noShadingVertex = `#version 300 es
layout (location = 0) in vec3 aPosition;
layout (location = 2) in vec2 aTexCoord;

uniform mat4 uViewModel;
uniform mat4 uProjection;

out vec2 vTexCoord;

void main() {
    // Calculate vertex position using view model matrix
    vec3 vertexPosition = (uViewModel * vec4(aPosition, 1)).xyz;
    vTexCoord = aTexCoord;
    gl_Position = uProjection * vec4(vertexPosition, 1);

}
`;

const noShadingFragment = `#version 300 es
precision mediump float;

uniform mediump sampler2D uTexture;

in vec2 vTexCoord;
out vec4 oColor;

void main() {
    oColor = texture(uTexture, vTexCoord);
}
`;

const grayscaleNoShadingFragment = `#version 300 es
precision mediump float;

uniform mediump sampler2D uTexture;

in vec2 vTexCoord;
out vec4 oColor;

void main() {
    vec4 color = texture(uTexture, vTexCoord);
    float intensity = (color.x + color.y + color.z) / 3.0;
    oColor = vec4(intensity, intensity, intensity, color.w);
}
`;

export default {
    lambert: { vertex, fragment },
    holographic: { vertex: holographicVertex, fragment: holographicFragment },
    noShading: { vertex: noShadingVertex, fragment: noShadingFragment },
    grayscaleLambert: { vertex: vertex, fragment: grayscaleFragment },
    grayscaleNoShading: { vertex: noShadingVertex, fragment: grayscaleNoShadingFragment }
};
